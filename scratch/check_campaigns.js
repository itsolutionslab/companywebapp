import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('/home/ec/projects/brecomperu/companywebapp/serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snapshot = await db.collection('campaigns').where('slug', '==', 'esmildacotrinaexplorando-ads-space').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Campaign: ${data.slug}`);
    console.log(`Blocks:`, JSON.stringify(data.blocks, null, 2));
  });
}
check();
