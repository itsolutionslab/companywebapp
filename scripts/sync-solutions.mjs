import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOLUTIONS_PATH = path.join(__dirname, '../public/soluciones');
const OUTPUT_FILE = path.join(__dirname, '../app/data/solutions.ts');

/**
 * Convierte un string tipo 'industrial-safety' a 'Industrial Safety'
 */
function formatTitle(str) {
    return str
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Escanea recursivamente buscando archivos .html
 */
function getHtmlFiles(dir, baseDir = '') {
    let results = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.join(baseDir, file);

        if (stat && stat.isDirectory()) {
            if (file !== '.git' && file !== 'node_modules') {
                results = results.concat(getHtmlFiles(filePath, relativePath));
            }
        } else if (file.endsWith('.html')) {
            results.push(relativePath);
        }
    });
    return results;
}

function generateSolutions() {
    console.log('🚀 Iniciando escaneo de soluciones...');
    
    if (!fs.existsSync(SOLUTIONS_PATH)) {
        console.error('❌ Error: La carpeta public/soluciones no existe.');
        return;
    }

    const htmlFiles = getHtmlFiles(SOLUTIONS_PATH);
    const solutionsMap = {};

    htmlFiles.forEach(file => {
        // Estructura esperada: [sector]/[subcat]/[tier]/[archivo].html
        // O: [sector]/[subcat]/custom/[cliente]/[archivo].html
        const parts = file.split(path.sep);
        if (parts.length < 2) return;

        const sector = parts[0];
        if (!solutionsMap[sector]) {
            solutionsMap[sector] = {
                id: sector,
                title: formatTitle(sector),
                industry: formatTitle(sector),
                description: `Soluciones especializadas para el sector ${formatTitle(sector)}.`,
                path: sector,
                entryFile: '',
                demos: [],
                tags: [formatTitle(sector), "Enterprise"]
            };
        }

        // Crear nombre legible para el demo
        // Ejemplo: exporter/standard/essential.html -> Exporter Standard Essential
        const demoName = parts.slice(1)
            .map(p => p.replace('.html', ''))
            .map(formatTitle)
            .join(' ');

        const demoEntry = {
            name: demoName,
            file: parts.slice(1).join('/')
        };

        solutionsMap[sector].demos.push(demoEntry);

        // El primer archivo que encuentre será el entryFile por defecto
        if (!solutionsMap[sector].entryFile) {
            solutionsMap[sector].entryFile = demoEntry.file;
        }
    });

    const finalSolutions = Object.values(solutionsMap);

    const content = `// ESTE ARCHIVO ES GENERADO AUTOMÁTICAMENTE. NO EDITAR DIRECTAMENTE.
// Ejecuta 'node scripts/sync-solutions.mjs' para actualizar.

export interface SolutionFile {
    name: string;
    file: string;
}

export interface SolutionDemo {
    id: string;
    title: string;
    industry: string;
    description: string;
    path: string;
    entryFile: string;
    demos?: SolutionFile[];
    tags: string[];
    featured?: boolean;
}

export const SOLUTIONS: SolutionDemo[] = ${JSON.stringify(finalSolutions, null, 4)};
`;

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`✅ Mapeo completado: ${finalSolutions.length} sectores encontrados.`);
    console.log(`📄 Archivo generado en: ${OUTPUT_FILE}`);
}

generateSolutions();
