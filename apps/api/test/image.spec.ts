import sharp from 'sharp'; import { describe,expect,it } from 'vitest'; import { normalizeCatalogImage } from '../src/catalog/image.controller';
describe('catalog image normalization',()=>{it('converts an image to a bounded WebP',async()=>{const input=await sharp({create:{width:1200,height:600,channels:4,background:'#ffffff'}}).png().toBuffer();const output=await normalizeCatalogImage(input);const metadata=await sharp(output).metadata();expect(metadata.format).toBe('webp');expect(metadata.width).toBe(800);expect(metadata.height).toBe(400);});});

