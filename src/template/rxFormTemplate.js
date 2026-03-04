const toothSvgs = require('./toothSvgs.js');

/**
 * Normalize tooth selection from formData.
 * Handles: plain arrays, Set objects, comma-separated strings, and {values:[...]} shapes.
 */
function getToothSet(formData, key) {
    const raw = formData && formData[key];
    if (!raw) return new Set();
    // Already a Set
    if (raw instanceof Set) return new Set([...raw].map(String));
    // Plain array
    if (Array.isArray(raw)) return new Set(raw.map(String));
    // {values: [...]} or {_values: [...]}
    const inner = raw.values || raw._values;
    if (Array.isArray(inner)) return new Set(inner.map(String));
    // Comma-separated string e.g. "upper-right-1,upper-left-2"
    if (typeof raw === 'string' && raw.length > 0) return new Set(raw.split(',').map(s => s.trim()));
    return new Set();
}

/**
 * Arch offsets derived directly from App.css nth-child rules.
 *
 * DOM render order in React (from RxFormPDFView.tsx):
 *   ur-tooth & br-tooth: teeth = [8,7,6,5,4,3,2,1]  → nth-child(1)=tooth8 ... nth-child(8)=tooth1
 *   ul-tooth & bl-tooth: teeth.slice().reverse() = [1,2,3,4,5,6,7,8] → nth-child(1)=tooth1 ... nth-child(8)=tooth8
 *
 * br-tooth (render order [8,7,6,5,4,3,2,1]):
 *   nth-child(1)=tooth8: +1.6rem → +25.6px
 *   nth-child(2)=tooth7: +1.3rem → +20.8px
 *   nth-child(3)=tooth6: +0.9rem → +14.4px
 *   nth-child(4)=tooth5: -0.1rem →  -1.6px
 *   nth-child(5)=tooth4: +0.3rem →  +4.8px
 *   nth-child(6)=tooth3: -0.1rem →  -1.6px
 *   nth-child(7)=tooth2: -0.5rem →  -8.0px
 *   nth-child(8)=tooth1: -0.7rem → -11.2px
 *
 * bl-tooth (render order [1,2,3,4,5,6,7,8]):
 *   nth-child(1)=tooth1: -0.7rem → -11.2px
 *   nth-child(2)=tooth2: -0.5rem →  -8.0px
 *   nth-child(3)=tooth3: -0.1rem →  -1.6px
 *   nth-child(4)=tooth4: +0.3rem →  +4.8px
 *   nth-child(5)=tooth5: -0.1rem →  -1.6px
 *   nth-child(6)=tooth6: +0.9rem → +14.4px
 *   nth-child(7)=tooth7: +1.3rem → +20.8px
 *   nth-child(8)=tooth8: +1.6rem → +25.6px
 *
 * ur-tooth (render order [8,7,6,5,4,3,2,1]):
 *   nth-child(1)=tooth8: -0.4rem →  -6.4px
 *   nth-child(2)=tooth7:  0.0rem →   0.0px
 *   nth-child(3)=tooth6: +0.5rem →  +8.0px
 *   nth-child(4)=tooth5: +0.7rem → +11.2px
 *   nth-child(5)=tooth4: +0.5rem →  +8.0px
 *   nth-child(6)=tooth3: +0.9rem → +14.4px
 *   nth-child(7)=tooth2: +1.1rem → +17.6px
 *   nth-child(8)=tooth1: +1.1rem → +17.6px
 *
 * ul-tooth (render order [1,2,3,4,5,6,7,8]):
 *   nth-child(1)=tooth1: +1.1rem → +17.6px
 *   nth-child(2)=tooth2: +1.1rem → +17.6px
 *   nth-child(3)=tooth3: +0.9rem → +14.4px
 *   nth-child(4)=tooth4: +0.5rem →  +8.0px
 *   nth-child(5)=tooth5: +0.7rem → +11.2px
 *   nth-child(6)=tooth6: +0.5rem →  +8.0px
 *   nth-child(7)=tooth7:  0.0rem →   0.0px
 *   nth-child(8)=tooth8: -0.4rem →  -6.4px
 */
const TOOTH_OFFSETS = {
    //              t1      t2      t3      t4     t5      t6     t7      t8
    'upper-right': { 1: 17.6, 2: 17.6, 3: 14.4, 4: 8.0, 5: 11.2, 6: 8.0, 7: 0.0, 8: -6.4 },
    'upper-left': { 1: 17.6, 2: 17.6, 3: 14.4, 4: 8.0, 5: 11.2, 6: 8.0, 7: 0.0, 8: -6.4 },
    'bottom-right': { 1: -11.2, 2: -8.0, 3: -1.6, 4: 4.8, 5: -1.6, 6: 14.4, 7: 20.8, 8: 25.6 },
    'bottom-left': { 1: -11.2, 2: -8.0, 3: -1.6, 4: 4.8, 5: -1.6, 6: 14.4, 7: 20.8, 8: 25.6 },
};

/**
 * Single tooth cell for PDF with arch offset matching App.css nth-child positioning.
 */
function toothCell(toothId, selected) {

    const fillColor = selected ? '#CDEFD2' : '#F2F2F2';
    const parts = toothId.split('-');
    const quadrant = parts.slice(0, -1).join('-');
    const num = parseInt(parts[parts.length - 1], 10);

    // Arch offset from App.css — use undefined check so 0 and negatives are preserved
    const quadrantOffsets = TOOTH_OFFSETS[quadrant];
    const offsetPx = (quadrantOffsets && quadrantOffsets[num] !== undefined) ? quadrantOffsets[num] : 0;
    const topStyle = `position:relative;top:${offsetPx}px;`;

    // Build SVG paths
    let svgContent = '';
    let viewBox = '0 0 22 28';

    const quadrantData = toothSvgs[quadrant];
    console.log("quadrantData", quadrantData);

    if (quadrantData && quadrantData[num]) {
        const tooth = quadrantData[num];
        viewBox = tooth.viewBox || '0 0 22 28';
        svgContent = (tooth.paths || []).map(function (p) {
            const fill = p.fill === 'dynamic' ? fillColor : (p.fill || 'black');
            const fillOpacity = p.fillOpacity ? ' fill-opacity="' + p.fillOpacity + '"' : '';
            return '<path d="' + escapeHtmlAttr(p.d) + '" fill="' + fill + '"' + fillOpacity + '/>';
        }).join('');
        console.log("tooth", tooth);
    } else {
        // Fallback generic tooth shape
        svgContent = '<path d="M2 4 Q2 0 11 0 Q20 0 20 4 L20 24 Q20 28 11 28 Q2 28 2 24 Z" fill="' + fillColor + '" stroke="#ccc" stroke-width="0.5"/>';
    }
    console.log("svgContent", svgContent);
    console.log("toothId", toothId);



    return (
        '<span class="tooth-cell" title="' + escapeHtmlAttr(toothId) + '" style="display:inline-block;width:22px;height:28px;margin:0 1px;' + topStyle + '">' +
        '<svg viewBox="' + viewBox + '" width="22" height="28" style="display:block;">' +
        svgContent +
        '</svg></span>'
    );
}

function escapeHtmlAttr(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * One quadrant row: teeth in given order, each with its arch offset applied.
 */
function renderQuadrant(teethOrder, prefix, selectedSet) {
    return teethOrder.map((n) => {
        const id = `${prefix}-${n}`;
        return toothCell(id, selectedSet.has(id));
    }).join('');
}

/**
 * One dental chart (e.g. Non Enamel): Upper Right, Upper Left, Bottom Right, Bottom Left.
 * Layout matches RxFormPDFView DentalChartPDF.
 */
function renderDentalChart(title, selectedSet) {
    const teeth = [8, 7, 6, 5, 4, 3, 2, 1];
    const teethReversed = [1, 2, 3, 4, 5, 6, 7, 8];
    return `
    <div class="dental-chart">
        <label class="chart-title">${title}</label>
        <div class="chart-row chart-upper">
            <div class="quadrant border-r">
                <div class="quadrant-label">Upper Right</div>
                <div class="teeth-row">${renderQuadrant(teeth, 'upper-right', selectedSet)}</div>
            </div>
            <div class="quadrant">
                <div class="quadrant-label">Upper Left</div>
                <div class="teeth-row">${renderQuadrant(teethReversed, 'upper-left', selectedSet)}</div>
            </div>
        </div>
        <div class="chart-divider"></div>
        <div class="chart-row chart-lower">
            <div class="quadrant border-r">
                 <div class="teeth-row">${renderQuadrant(teeth, 'bottom-right', selectedSet)}</div>
                <div class="quadrant-label">Bottom Right</div>
            </div>
            <div class="quadrant">
                <div class="teeth-row">${renderQuadrant(teethReversed, 'bottom-left', selectedSet)}</div>
                <div class="quadrant-label">Bottom Left</div>
            </div>
        </div>
    </div>`;
}

function generateRxFormHTML(formData) {
    const nonEnamel = getToothSet(formData, 'nonEnamelTeeth');
    const lingual = getToothSet(formData, 'lingualTeeth');
    const button = getToothSet(formData, 'buttonTeeth');

    const appointmentDateDisplay = formData.appointmentDate
        ? (typeof formData.appointmentDate === 'string'
            ? formData.appointmentDate
            : (formData.appointmentDate.toDateString && formData.appointmentDate.toDateString()) || formData.appointmentDate)
        : '-';

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
    body {
        font-family: Arial, sans-serif;
        padding: 10px 20px;
        color: #1f2937;
    }
    h1 {
        text-align: center;
        margin-bottom: 10px;
    }
    h2 {
        margin-top: 5px;
        margin-bottom: 5px;
        font-size: 16px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
    }
    .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 30px;
    }
    .field-label {
        font-size: 12px;
        color: #3E485F;
    }
    .field-value {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .section {
        margin-bottom: 5px;
    }
    .dental-charts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 20px;
        margin: 5px 0;
    }
    .dental-chart {
        // /* border: 1px solid #e5e7eb; */
        // border-radius: 8px;
        // padding: 12px;
        // /* background: #fafafa; */
    }
    .chart-title {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
    }
    .chart-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }
    .chart-upper {
        /* Upper arch: teeth offset downward up to +17.6px */
        height: 60px;
        overflow: visible;
        margin-bottom: 0;
    }
    .chart-lower {
        /* Bottom arch teeth range from -11.2px (above row top) to +25.6px (below).
           padding-top offsets the row down so negative-top teeth are visible. */
        padding-top: 14px;
        height: 90px;
        overflow: visible;
        margin-top: 0;
    }
    .chart-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 0;
    }
    .quadrant {
        flex: 1;
        text-align: center;
    }
    .quadrant-label {
        font-size: 11px;
        color: #6b7280;
        margin-bottom: 2px;
    }
    .chart-lower .quadrant-label { margin-bottom: 0; margin-top: 4px; }
    .teeth-row {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-wrap: nowrap;
        gap: 0;
        /* overflow visible so arch offsets aren't clipped */
        overflow: visible;
    }
    .tooth-cell {
        flex-shrink: 0;
    }
    .border-r {
        height: 3rem;
        border-right: 1px solid #e5e7eb;
        padding-right: 10px;
    }
</style>
</head>
<body>

<h1>Invisalign Rx Form</h1>

<div class="section">
<h2>Patient Information</h2>
<div class="grid">
    <div>
        <div class="field-label">First Name</div>
        <div class="field-value">${formData.firstName || '-'}</div>
    </div>
    <div>
        <div class="field-label">Last Name</div>
        <div class="field-value">${formData.lastName || '-'}</div>
    </div>
    <div>
        <div class="field-label">Appointment Date</div>
        <div class="field-value">${appointmentDateDisplay}</div>
    </div>
    <div>
        <div class="field-label">Appointment Type</div>
        <div class="field-value">${formData.appointmentType || '-'}</div>
    </div>
</div>
</div>

<div class="section">
<h2>Case Review Details</h2>
<div class="grid">
    <div>
        <div class="field-label">Type</div>
        <div class="field-value">${formData.type || '-'}</div>
    </div>
    <div>
        <div class="field-label">Wear Schedule</div>
        <div class="field-value">${formData.wearSchedule || '-'}</div>
    </div>
    <div>
        <div class="field-label">IPR @ Aligner</div>
        <div class="field-value">${formData.iprAtAligner || '-'}</div>
    </div>
    <div>
        <div class="field-label">Pontic</div>
        <div class="field-value">${formData.pontic || '-'}</div>
    </div>
    <div>
        <div class="field-label">Left Elastic</div>
        <div class="field-value">${formData.leftElastic || '-'}</div>
    </div>
    <div>
        <div class="field-label">Right Elastic</div>
        <div class="field-value">${formData.rightElastic || '-'}</div>
    </div>
</div>

<div class="dental-charts">
    ${renderDentalChart('Non Enamel', nonEnamel)}
    ${renderDentalChart('Lingual', lingual)}
    ${renderDentalChart('Button', button)}
</div>
</div>

<div class="section">
<h2>Additional Information</h2>
<div class="grid">
    <div>
    <div class="field-label">Aligner Modifications</div>
    <div class="field-value">${formData.alignerModifications || '-'}</div>
    </div>
    <div>
    <div class="field-label">Additional Notes</div>
    <div class="field-value">${formData.additionalNotes || '-'}</div>
    </div>
    <div>
    <div class="field-label">Hold @</div>
    <div class="field-value">${formData.holdAt || '-'}</div>
    </div>
    <div>
    <div class="field-label">In Office Appt</div>
    <div class="field-value">${formData.inOfficeAppt || '-'}</div>
    </div>
    <div>
    <div class="field-label">Appointment changed</div>
    <div class="field-value">${formData.appointmentChanged || '-'}</div>
    </div>
    <div>
        <div class="field-label">Virtual Check @</div>
        <div class="field-value">${formData.virtualCheckAt || '-'}</div>
    </div>
    <div>
    </div>
    <div>
        <div class="field-label">Scan @</div>
        <div class="field-value">${formData.scanAt || '-'}</div>
    </div>
    <div>
    </div>
    <div>
    <div class="field-label">Next Scan</div>
    <div class="field-value">${formData.nextScan || '-'}</div>
    </div>
</div>
</div>

</body>
</html>
`;
}

module.exports = generateRxFormHTML;