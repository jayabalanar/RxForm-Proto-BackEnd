const toothSvgs = require('./toothSvgs.js');

/**
 * Normalize tooth selection from formData (array or undefined).
 * Matches frontend: nonEnamelTeeth, lingualTeeth, buttonTeeth as arrays of IDs e.g. "upper-right-1".
 */
function getToothSet(formData, key) {
    const raw = formData && formData[key];
    if (Array.isArray(raw)) return new Set(raw.map(String));
    return new Set();
}

/**
 * Single tooth cell for PDF: exact SVG from RxForm tooth.tsx (path data in toothSvgs.js).
 * selected = #CDEFD2, unselected = #F2F2F2 for the first path; other paths use stored fill.
 */
function toothCell(toothId, selected) {
    const fillColor = selected ? '#CDEFD2' : '#F2F2F2';
    const parts = toothId.split('-');
    if (parts.length < 3) {
        const fill = fillColor;
        return `<span class="tooth-cell" title="${toothId}" style="display:inline-block;width:22px;height:28px;margin:0 2px;"><svg viewBox="0 0 22 28" width="22" height="28" style="display:block;"><path d="M2 4 Q2 0 11 0 Q20 0 20 4 L20 24 Q20 28 11 28 Q2 28 2 24 Z" fill="${fill}" stroke="#ccc" stroke-width="0.5"/></svg></span>`;
    }
    const quadrant = parts.slice(0, -1).join('-');
    const num = parseInt(parts[parts.length - 1], 10);
    const quadrantData = toothSvgs[quadrant];
    if (!quadrantData || !quadrantData[num]) {
        return `<span class="tooth-cell" title="${toothId}" style="display:inline-block;width:22px;height:28px;margin:0 2px;"><svg viewBox="0 0 22 28" width="22" height="28" style="display:block;"><path d="M2 4 Q2 0 11 0 Q20 0 20 4 L20 24 Q20 28 11 28 Q2 28 2 24 Z" fill="${fillColor}" stroke="#ccc" stroke-width="0.5"/></svg></span>`;
    }
    const tooth = quadrantData[num];
    const viewBox = tooth.viewBox || '0 0 22 28';
    const pathParts = (tooth.paths || []).map(function (p) {
        const fill = p.fill === 'dynamic' ? fillColor : (p.fill || 'black');
        const fillOpacity = p.fillOpacity ? ' fill-opacity="' + p.fillOpacity + '"' : '';
        return '<path d="' + escapeHtmlAttr(p.d) + '" fill="' + fill + '"' + fillOpacity + '/>';
    });
    const svgInner = pathParts.join('');
    return '<span class="tooth-cell" title="' + escapeHtmlAttr(toothId) + '" style="display:inline-block;width:22px;height:28px;margin:0 2px;"><svg viewBox="' + viewBox + '" width="22" height="28" style="display:block;">' + svgInner + '</svg></span>';
}

function escapeHtmlAttr(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * One quadrant row: teeth 1-8 (or 8-1 for left side).
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
            <div class="quadrant">
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
            <div class="quadrant">
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
        padding: 40px;
        color: #1f2937;
    }
    h1 {
        text-align: center;
        margin-bottom: 30px;
    }
    h2 {
        margin-top: 30px;
        margin-bottom: 10px;
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
        margin-bottom: 20px;
    }
    .dental-charts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px 20px;
        margin: 16px 0;
    }
    .dental-chart {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
        background: #fafafa;
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
    .chart-upper { margin-bottom: 4px; }
    .chart-lower { margin-top: 4px; }
    .chart-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 6px 0;
    }
    .quadrant {
        flex: 1;
        text-align: center;
    }
    .quadrant-label {
        font-size: 11px;
        color: #6b7280;
        margin-bottom: 4px;
    }
    .chart-lower .quadrant-label { margin-bottom: 0; margin-top: 4px; }
    .teeth-row {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: nowrap;
        gap: 0;
    }
    .tooth-cell {
        flex-shrink: 0;
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
<div>
    <div class="field-label">Aligner Modifications</div>
    <div class="field-value">${formData.alignerModifications || '-'}</div>

    <div class="field-label">Additional Notes</div>
    <div class="field-value">${formData.additionalNotes || '-'}</div>

    <div class="field-label">Hold @</div>
    <div class="field-value">${formData.holdAt || '-'}</div>

    <div class="field-label">In Office Appt</div>
    <div class="field-value">${formData.inOfficeAppt || '-'}</div>

    <div class="field-label">Appointment changed</div>
    <div class="field-value">${formData.appointmentChanged || '-'}</div>

    <div class="field-label">Virtual Check @</div>
    <div class="field-value">${formData.virtualCheckAt || '-'}</div>

    <div class="field-label">Scan @</div>
    <div class="field-value">${formData.scanAt || '-'}</div>

    <div class="field-label">Next Scan</div>
    <div class="field-value">${formData.nextScan || '-'}</div>
</div>
</div>

</body>
</html>
`;
}

module.exports = generateRxFormHTML;
