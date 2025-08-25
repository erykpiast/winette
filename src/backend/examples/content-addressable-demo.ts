#!/usr/bin/env tsx
// Demonstration of content-addressable storage path generation

import crypto from 'node:crypto';
import { getContentAddressablePath } from '#backend/lib/image-storage.js';

console.log('🗂️  Content-Addressable Storage Path Demo');
console.log('='.repeat(50));

// Example 1: Same content always gets same path
console.log('\n📁 Example 1: Same content = same path globally');
const content1 = Buffer.from('This is image content A');
const checksum1 = crypto.createHash('sha256').update(content1).digest('hex');
const path1a = getContentAddressablePath(checksum1, 'png');
const path1b = getContentAddressablePath(checksum1, 'png');

console.log('Content:', content1.toString());
console.log('Checksum:', `${checksum1.substring(0, 12)}...`);
console.log('Path A:', path1a);
console.log('Path B:', path1b);
console.log('Same path:', path1a === path1b);

// Example 2: Different content gets different paths
console.log('\n📁 Example 2: Different content = different paths');
const content2 = Buffer.from('This is image content B');
const checksum2 = crypto.createHash('sha256').update(content2).digest('hex');
const path2 = getContentAddressablePath(checksum2, 'png');

console.log('Content A checksum:', `${checksum1.substring(0, 12)}...`);
console.log('Content B checksum:', `${checksum2.substring(0, 12)}...`);
console.log('Path A:', path1a);
console.log('Path B:', path2);
console.log('Different paths:', path1a !== path2);

// Example 3: Full checksum prevents collisions
console.log('\n📁 Example 3: Full checksum for collision prevention');
// These would collide if we only used first 12 characters
const similarChecksum1 = 'abcdef123456AAAAAAA890abcdef1234567890abcdef1234567890abcdef12';
const similarChecksum2 = 'abcdef123456BBBBBBB890abcdef1234567890abcdef1234567890abcdef34';

const similarPath1 = getContentAddressablePath(similarChecksum1, 'jpg');
const similarPath2 = getContentAddressablePath(similarChecksum2, 'jpg');

console.log('Checksum 1 (first 12):', similarChecksum1.substring(0, 12));
console.log('Checksum 2 (first 12):', similarChecksum2.substring(0, 12));
console.log('Would collide with truncated checksum? YES');
console.log('');
console.log('Full Path 1:', similarPath1);
console.log('Full Path 2:', similarPath2);
console.log('Collision with full checksum:', similarPath1 === similarPath2 ? 'YES' : 'NO');

// Example 4: Format handling
console.log('\n📁 Example 4: Different formats, same content');
const formats = ['png', 'jpg', 'webp'];
const baseChecksum = checksum1;

formats.forEach((format) => {
  const path = getContentAddressablePath(baseChecksum, format);
  console.log(`${format.toUpperCase()} path:`, path);
});

console.log('\n✅ Content-Addressable Storage Benefits:');
console.log('   • Same content = same URL globally (optimal deduplication)');
console.log('   • Safe immutable caching (URL never changes content)');
console.log('   • Full checksum prevents collisions');
console.log('   • Format-specific but content-addressable');
console.log('   • Storage-efficient (no duplicate uploads)');

console.log('\n🔄 Cache Semantics with Content-Addressable Storage:');
console.log('   • Cache-Control: public, max-age=31536000, immutable');
console.log('   • Safe because content/{checksum}.{ext} never changes');
console.log('   • No cache invalidation needed');
console.log('   • CDN can cache forever');
