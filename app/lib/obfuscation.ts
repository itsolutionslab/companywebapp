/**
 * Simple obfuscation utility to prevent casual inspection of data payloads 
 * in the browser's Network tab.
 */

/**
 * Encodes an object into an obfuscated string.
 */
export function obfuscateData(data: any): string {
    try {
        const jsonStr = JSON.stringify(data);
        // Basic Base64 encoding + simple char shift or reversal for extra "fuzzing"
        const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
        return encoded.split('').reverse().join(''); // Reverse to make it look even less recognizable
    } catch (e) {
        console.error('Obfuscation error:', e);
        return '';
    }
}

/**
 * Decodes an obfuscated string back into an object.
 */
export function deobfuscateData(str: string): any {
    try {
        // Reverse back and Decode Base64
        const reversed = str.split('').reverse().join('');
        const decoded = decodeURIComponent(escape(atob(reversed)));
        return JSON.parse(decoded);
    } catch (e) {
        console.error('Deobfuscation error:', e);
        return null;
    }
}
