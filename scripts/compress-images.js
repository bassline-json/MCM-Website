import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'assets', 'images');

async function compressImages() {
    console.log('🔍 Recherche des images dans :', IMAGES_DIR);
    
    try {
        const files = await fs.promises.readdir(IMAGES_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
        });

        console.log(`📸 ${imageFiles.length} image(s) trouvée(s). Début de la compression...`);

        for (const file of imageFiles) {
            const filePath = path.join(IMAGES_DIR, file);
            const stats = await fs.promises.stat(filePath);
            const originalSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            // Output name is same but with .webp extension
            const fileBaseName = path.basename(file, path.extname(file));
            const outputFileName = `${fileBaseName}.webp`;
            const outputPath = path.join(IMAGES_DIR, outputFileName);

            console.log(`⚡ Compression de : ${file} (${originalSizeMB} Mo) -> ${outputFileName}...`);

            // Read, resize, and convert to WebP
            const image = sharp(filePath);
            const metadata = await image.metadata();

            let pipeline = image;
            // Resize if wider than 1920px
            if (metadata.width && metadata.width > 1920) {
                pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
            }

            await pipeline
                .webp({ quality: 80, effort: 4 })
                .toFile(outputPath);

            const outStats = await fs.promises.stat(outputPath);
            const newSizeKB = (outStats.size / 1024).toFixed(1);
            const newSizeMB = (outStats.size / (1024 * 1024)).toFixed(2);
            
            console.log(`✅ Succès : ${outputFileName} créé. Taille : ${newSizeKB} Ko (${newSizeMB} Mo). Réduction massive !`);
        }
        
        console.log('🎉 Compression terminée avec succès pour toutes les images !');
    } catch (error) {
        console.error('❌ Erreur durant le processus de compression :', error);
    }
}

compressImages();
