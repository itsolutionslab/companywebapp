import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { ROLES_CONFIG } from '@/config/roles_config';

const EXPECTED_HEADERS = [
    "Nombre de Contacto", "Empresa", "Email", "Teléfono", "Modelo de Entrega", 
    "Capacidad", "Descripción de Proyecto", "LinkedIn Empresa", "Rubro Principal", 
    "Subrubro", "Prioridad", "Comentarios", "Tipo de Empresa", 
    "Tamaño de Empresa", "Zona Geográfica", "Dolor Principal", "Servicio Ofrecido"
];

export async function POST(req: Request) {
    try {
        // 1. Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
        }

        const requesterUid = decodedToken.uid;
        const requesterDoc = await adminDb.collection('users').doc(requesterUid).get();
        if (!requesterDoc.exists) {
            return NextResponse.json({ error: 'Usuario no encontrado en el sistema' }, { status: 404 });
        }

        const requesterData = requesterDoc.data();
        const requesterRole = String(requesterData?.role || 'staff').toLowerCase();
        
        // Check if role is in config
        const roleConfig = ROLES_CONFIG[requesterRole.toUpperCase()] || ROLES_CONFIG[requesterRole];
        if (!roleConfig) {
            return NextResponse.json({ error: 'Permisos insuficientes para realizar esta operación' }, { status: 403 });
        }

        // 2. Parse request formData
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;
        if (!file) {
            return NextResponse.json({ error: 'Archivo no adjuntado' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Read workbook using xlsx
        let workbook;
        try {
            workbook = XLSX.read(buffer, { type: 'buffer' });
        } catch (e: any) {
            return NextResponse.json({ error: 'Error al leer el archivo Excel. Asegúrate de subir un archivo .xlsx, .xls o .csv válido.' }, { status: 400 });
        }

        if (workbook.SheetNames.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel no contiene hojas de datos.' }, { status: 400 });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of arrays
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

        if (rows.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel está vacío.' }, { status: 400 });
        }

        // 3. Validate Header Structure
        const headerRow = rows[0].map(h => String(h || "").trim());
        const normalizedExpected = EXPECTED_HEADERS.map(h => h.toLowerCase());
        
        // Check if all expected headers are present in the exact order
        const structureOk = EXPECTED_HEADERS.length <= headerRow.length && normalizedExpected.every((expectedVal, index) => {
            const uploadedVal = headerRow[index] ? headerRow[index].toLowerCase() : "";
            return uploadedVal === expectedVal;
        });

        if (!structureOk) {
            return NextResponse.json({ 
                error: 'La estructura del archivo Excel no coincide con la plantilla autorizada. Asegúrate de usar la plantilla descargada sin modificar el orden ni el nombre de las cabeceras.' 
            }, { status: 400 });
        }

        // 4. Extract data rows, filtering out completely empty rows
        const dataRows: any[][] = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const isEmptyRow = row.every(val => String(val || "").trim() === "");
            if (!isEmptyRow) {
                dataRows.push(row);
            }
        }

        if (dataRows.length === 0) {
            return NextResponse.json({ error: 'El archivo Excel no contiene registros de leads.' }, { status: 400 });
        }

        // Check 500 row limit
        if (dataRows.length > 500) {
            return NextResponse.json({ error: 'El archivo excede el límite permitido de 500 registros por importación.' }, { status: 400 });
        }

        const requesterName = requesterData?.name || decodedToken.name || requesterData?.email || 'Usuario';
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = req.headers.get('user-agent') || '';
        const timestamp = new Date().toISOString();

        // 5. Validate row data and build lead documents
        const leadsToCreate: any[] = [];
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2; // Row number in sheet (1-based, index i starts at row 2)

            // Column 0: Nombre de Contacto (Required)
            const name = String(row[0] || "").trim();
            if (!name) {
                return NextResponse.json({ error: `Fila ${rowIndex}: El campo 'Nombre de Contacto' es obligatorio.` }, { status: 400 });
            }
            if (name.length < 2 || name.length > 100) {
                return NextResponse.json({ error: `Fila ${rowIndex}: El 'Nombre de Contacto' debe tener entre 2 y 100 caracteres.` }, { status: 400 });
            }

            // Column 1: Empresa
            const company = String(row[1] || "").trim();

            // Column 2: Email (Optional, validate format if present)
            const email = String(row[2] || "").trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return NextResponse.json({ error: `Fila ${rowIndex}: El correo electrónico '${email}' no tiene un formato válido.` }, { status: 400 });
            }

            // Column 3: Teléfono
            const phone = String(row[3] || "").trim();

            // Column 4: Modelo de Entrega (Must match options, default to ADVISORY)
            let deliveryModel = String(row[4] || "").trim().toUpperCase();
            const allowedDeliveryModels = ['ADVISORY', 'IMPLEMENTATION', 'MANAGED_SERVICES', 'STAFF_AUGMENTATION'];
            if (deliveryModel && !allowedDeliveryModels.includes(deliveryModel)) {
                // If it is in spanish, let's map it or keep it as advisory
                if (deliveryModel.includes('MANAGED')) deliveryModel = 'MANAGED_SERVICES';
                else if (deliveryModel.includes('STAFF')) deliveryModel = 'STAFF_AUGMENTATION';
                else deliveryModel = 'ADVISORY';
            } else if (!deliveryModel) {
                deliveryModel = 'ADVISORY';
            }

            // Column 5: Capacidad (Must match options, default to SOFTWARE)
            let capability = String(row[5] || "").trim().toUpperCase();
            const allowedCapabilities = ['SOFTWARE', 'AI', 'MARKETING', 'CLOUD', 'ERP', 'DATA', 'PMO', 'AUTOMATION'];
            if (capability && !allowedCapabilities.includes(capability)) {
                if (capability.includes('SOFTWARE') || capability.includes('DESARROLLO')) capability = 'SOFTWARE';
                else if (capability.includes('IA') || capability.includes('DATA SCIENCE') || capability.includes('ROBOT')) capability = 'AI';
                else if (capability.includes('MARKETING') || capability.includes('GROWTH')) capability = 'MARKETING';
                else if (capability.includes('CLOUD') || capability.includes('INFRA')) capability = 'CLOUD';
                else if (capability.includes('ERP')) capability = 'ERP';
                else if (capability.includes('ANALYTICS') || capability.includes('ANALÍTICA')) capability = 'DATA';
                else if (capability.includes('PMO') || capability.includes('PROYECTO')) capability = 'PMO';
                else if (capability.includes('AUTOMATIZ') || capability.includes('RPA')) capability = 'AUTOMATION';
                else capability = 'SOFTWARE';
            } else if (!capability) {
                capability = 'SOFTWARE';
            }

            // Column 6: Descripción de Proyecto
            const projectDesc = String(row[6] || "").trim();

            // Column 7: LinkedIn Empresa
            const companyLinkedin = String(row[7] || "").trim();

            // Column 8: Rubro Principal
            const rubroPrincipal = String(row[8] || "").trim();

            // Column 9: Subrubro
            const subrubro = String(row[9] || "").trim();

            // Column 10: Prioridad (caliente, tibio, frio)
            let prioridad = String(row[10] || "").trim().toLowerCase();
            if (prioridad && !['caliente', 'tibio', 'frio'].includes(prioridad)) {
                if (prioridad.includes('cal') || prioridad.includes('hot')) prioridad = 'caliente';
                else if (prioridad.includes('tib') || prioridad.includes('warm')) prioridad = 'tibio';
                else if (prioridad.includes('fri') || prioridad.includes('cold')) prioridad = 'frio';
                else prioridad = 'tibio';
            } else if (!prioridad) {
                prioridad = 'tibio';
            }

            // Column 11: Comentarios
            const comentarios = String(row[11] || "").trim();

            // Column 12: Tipo de Empresa
            const tipoEmpresa = String(row[12] || "").trim();

            // Column 13: Tamaño de Empresa
            const tamanoEmpresa = String(row[13] || "").trim();

            // Column 14: Zona Geográfica
            const zonaGeografica = String(row[14] || "").trim();

            // Column 15: Dolor Principal
            const dolorPrincipal = String(row[15] || "").trim();

            // Column 16: Servicio Ofrecido
            const servicioOfrecido = String(row[16] || "").trim();

            const leadId = uuidv4();

            const leadDoc = {
                lead_id: leadId,
                created_by: requesterUid,
                created_by_name: requesterName,
                owner_id: requesterUid,
                has_attachments: false,
                created_from_excel: true,
                priority: prioridad === 'caliente' ? 'HIGH' : prioridad === 'frio' ? 'LOW' : 'MEDIUM',
                data: {
                    name,
                    email,
                    phone,
                    company,
                    website: "",
                    role: "",
                    objectives: [],
                    stage: "",
                    timeline: "",
                    investment_level: "",
                    impact: "",
                    project_desc: projectDesc,
                    decision_maker: "",
                    file_url: "",
                    origin: 'admin_panel',
                    company_linkedin: companyLinkedin,
                    rubro_principal: rubroPrincipal,
                    subrubro,
                    comentarios,
                    prioridad_lead: prioridad,
                    tipo_empresa: tipoEmpresa,
                    tamano_empresa: tamanoEmpresa,
                    zona_geografica: zonaGeografica,
                    dolor_principal: dolorPrincipal,
                    servicio_ofrecido: servicioOfrecido,
                    delivery_model: deliveryModel,
                    capability: capability
                },
                audit_logs: {
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now(),
                    ip: clientIp,
                    user_agent: userAgent
                },
                kpis: {
                    session_duration: 0,
                    clicks_count: 0
                },
                status_flow: {
                    current: 'LEAD_NEW',
                    history: [{
                        status: 'LEAD_NEW',
                        timestamp,
                        notes: 'Creado masivamente desde Excel'
                    }]
                },
                source_attribution: {
                    landing_page: 'excel_import',
                    utm_source: 'excel_import'
                }
            };

            leadsToCreate.push(leadDoc);
        }

        // 6. Write in atomic Firestore Batch
        const batch = adminDb.batch();
        for (const lead of leadsToCreate) {
            const leadRef = adminDb.collection('leads').doc(lead.lead_id);
            batch.set(leadRef, lead);
        }
        await batch.commit();

        return NextResponse.json({ success: true, count: leadsToCreate.length });

    } catch (error: any) {
        console.error('Error in lead excel import API:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor al procesar la importación' }, { status: 500 });
    }
}
