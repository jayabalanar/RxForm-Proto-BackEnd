/**
 * One-time script: reads RxForm tooth.tsx and outputs template/toothSvgs.js
 * with exact SVG path data for backend PDF template.
 */
const fs = require('fs');
const path = require('path');

const toothPath = path.join(__dirname, '../../RxForm/src/components/tooth/tooth.tsx');
const outPath = path.join(__dirname, '../src/template/toothSvgs.js');

const src = fs.readFileSync(toothPath, 'utf8');

const quadrantMap = [
    { name: 'bottom-left', pattern: /export function BottomLeftTooth[\s\S]*?^export function/m },
    { name: 'bottom-right', pattern: /export function BottomRightTooth[\s\S]*?^export function/m },
    { name: 'upper-right', pattern: /export function UpperRightTooth[\s\S]*?^export function/m },
    { name: 'upper-left', pattern: /export function UpperLeftTooth[\s\S]*/ },
];

const viewBoxRe = /viewBox="([^"]+)"/;
const pathRe = /<path\s+d="([^"]+)"\s+fill=(?:\{fillColor\}|"([^"]+)")(?:\s+fillOpacity="([^"]+)")?\s*\/>/g;
const pathReAlt = /<\s*path\s+d="([^"]+)"\s+fill=(?:\{fillColor\}|"([^"]+)")(?:\s+fillOpacity="([^"]+)")?\s*\/>/g;

function extractToothSvgs(section) {
    const teeth = {};
    for (let n = 1; n <= 8; n++) {
        const blockRe = new RegExp(
            `if \\(toothNumber === ${n}\\)[\\s\\S]*?return \\([\\s\\S]*?<svg\\s+viewBox="([^"]+)"[\\s\\S]*?</svg>`,
            'm'
        );
        const match = section.match(blockRe);
        if (!match) continue;
        const svgBlock = match[0];
        const viewBoxMatch = svgBlock.match(viewBoxRe);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 22 28';
        const paths = [];
        let m;
        const re = pathRe;
        re.lastIndex = 0;
        while ((m = re.exec(svgBlock)) !== null) {
            paths.push({
                d: m[1],
                fill: m[2] === undefined ? 'dynamic' : m[2],
                fillOpacity: m[3]
            });
        }
        if (paths.length === 0) {
            pathReAlt.lastIndex = 0;
            while ((m = pathReAlt.exec(svgBlock)) !== null) {
                paths.push({
                    d: m[1],
                    fill: m[2] === undefined ? 'dynamic' : m[2],
                    fillOpacity: m[3]
                });
            }
        }
        if (paths.length === 0) {
            const dRe = /<path\s+d="([^"]+)"\s+fill=(?:\{fillColor\}|"([^"]*)")(?:\s+fillOpacity="([^"]+)")?\s*\/>/g;
            let dm;
            while ((dm = dRe.exec(svgBlock)) !== null) {
                paths.push({
                    d: dm[1],
                    fill: dm[2] === undefined || dm[2] === '' ? 'dynamic' : dm[2],
                    fillOpacity: dm[3]
                });
            }
        }
        teeth[n] = { viewBox, paths };
    }
    return teeth;
}

function escapeForJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function serializeTooth(data) {
    const pathStrs = data.paths.map((p) => {
        const fillVal = p.fill === 'dynamic' ? "'dynamic'" : `"${escapeForJs(p.fill)}"`;
        const op = p.fillOpacity ? `, fillOpacity: "${p.fillOpacity}"` : '';
        return `        { d: "${escapeForJs(p.d)}", fill: ${fillVal}${op} }`;
    });
    return `    viewBox: "${data.viewBox}",
    paths: [
${pathStrs.join(',\n')}
    ]`;
}

const result = {};

for (const { name, pattern } of quadrantMap) {
    const m = src.match(pattern);
    if (!m) {
        console.warn('No match for quadrant', name);
        continue;
    }
    result[name] = extractToothSvgs(m[0]);
    console.log(name, Object.keys(result[name]).length, 'teeth');
}

let out = `/**
 * Exact tooth SVG path data from RxForm/src/components/tooth/tooth.tsx.
 * Used by rxFormTemplate.js for PDF dental charts. First path per tooth uses fill "dynamic" (selected/unselected).
 */
module.exports = {
`;

const quadrants = ['bottom-left', 'bottom-right', 'upper-right', 'upper-left'];
for (const q of quadrants) {
    if (!result[q]) continue;
    out += `  "${q}": {\n`;
    for (let n = 1; n <= 8; n++) {
        if (!result[q][n]) continue;
        out += `    ${n}: {\n${serializeTooth(result[q][n])}\n    },\n`;
    }
    out += `  },\n`;
}
out += `};\n`;

fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath);
