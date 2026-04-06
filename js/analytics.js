// analytics.js - Advanced Analytics & Insights
let trendChart = null;
let currentPeriod = 'monthly'; // 'monthly' or 'weekly'
let studentsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure data is loaded
    if (window.students.length === 0 && typeof window.loadStudentsFromCloud === 'function') {
        await window.loadStudentsFromCloud();
    }
    studentsData = window.students || [];
    populateStudentSelect();
    refreshAnalytics();
});

function populateStudentSelect() {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    select.innerHTML = '<option value="all">📊 Whole Class (Overall)</option>';
    studentsData.forEach(s => {
        select.innerHTML += `<option value="${s.roll}">👨‍🎓 ${escapeHtml(s.name)} (Roll: ${s.roll})</option>`;
    });
}

async function refreshAnalytics() {
    const selectedRoll = document.getElementById('studentSelect').value;
    let attendanceData = [];
    let studentName = 'Whole Class';

    if (selectedRoll === 'all') {
        // Overall class attendance percentage per day
        attendanceData = getOverallAttendanceTimeline();
        studentName = 'Whole Class';
    } else {
        const student = studentsData.find(s => s.roll == selectedRoll);
        if (student) {
            attendanceData = getStudentAttendanceTimeline(student);
            studentName = student.name;
        }
    }
    
    // Prepare dates and percentages for chart
    const dates = attendanceData.map(d => d.date);
    const percentages = attendanceData.map(d => d.percentage);
    
    // Filter based on period (monthly or weekly)
    let filteredDates, filteredPercentages;
    if (currentPeriod === 'weekly') {
        // Last 7 days
        filteredDates = dates.slice(-7);
        filteredPercentages = percentages.slice(-7);
    } else {
        // Last 30 days for monthly trend
        filteredDates = dates.slice(-30);
        filteredPercentages = percentages.slice(-30);
    }
    
    updateTrendChart(filteredDates, filteredPercentages, studentName);
    generatePredictionAlert(filteredPercentages, studentName);
    renderHeatmap(selectedRoll);
}

function getOverallAttendanceTimeline() {
    // Collect all dates from all students
    const allDates = new Set();
    studentsData.forEach(s => {
        if (s.attendance) Object.keys(s.attendance).forEach(d => allDates.add(d));
    });
    const sortedDates = Array.from(allDates).sort();
    
    const timeline = [];
    for (let date of sortedDates) {
        let total = studentsData.length;
        let present = studentsData.filter(s => s.attendance && s.attendance[date] === 'Present').length;
        let percent = total === 0 ? 0 : Math.round((present / total) * 100);
        timeline.push({ date, percentage: percent });
    }
    return timeline;
}

function getStudentAttendanceTimeline(student) {
    if (!student.attendance) return [];
    const dates = Object.keys(student.attendance).sort();
    const timeline = [];
    for (let date of dates) {
        const status = student.attendance[date];
        const percent = status === 'Present' ? 100 : 0;
        timeline.push({ date, percentage: percent });
    }
    return timeline;
}

function updateTrendChart(labels, data, studentName) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${studentName} Attendance %`,
                data: data,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: data.map(p => p >= 75 ? '#2ecc71' : '#e74c3c'),
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Attendance %' }
                },
                x: {
                    title: { display: true, text: currentPeriod === 'weekly' ? 'Last 7 Days' : 'Last 30 Days' }
                }
            },
            plugins: {
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw}%` } },
                annotation: {
                    annotations: {
                        line75: {
                            type: 'line',
                            yMin: 75,
                            yMax: 75,
                            borderColor: '#f39c12',
                            borderWidth: 2,
                            borderDash: [5,5],
                            label: { content: '75% Threshold', enabled: true }
                        }
                    }
                }
            }
        }
    });
}

function generatePredictionAlert(percentages, studentName) {
    const alertDiv = document.getElementById('predictionAlert');
    if (!alertDiv || percentages.length < 5) {
        alertDiv.style.display = 'none';
        return;
    }
    
    // Simple linear regression on last 5 points
    const recent = percentages.slice(-5);
    const x = [0,1,2,3,4];
    const n = recent.length;
    let sumX = x.reduce((a,b)=>a+b,0);
    let sumY = recent.reduce((a,b)=>a+b,0);
    let sumXY = 0, sumX2 = 0;
    for (let i=0; i<n; i++) {
        sumXY += x[i] * recent[i];
        sumX2 += x[i] * x[i];
    }
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX)/n;
    const nextWeekPred = slope * 7 + intercept; // predict 7 days ahead
    const nextWeekClamped = Math.min(100, Math.max(0, nextWeekPred));
    
    if (nextWeekClamped < 75) {
        alertDiv.style.display = 'block';
        alertDiv.className = 'prediction-alert warning';
        alertDiv.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i> 
            <strong>Predictive Alert:</strong> ${studentName} ki attendance ${nextWeekClamped.toFixed(1)}% 
            rehne ki sambhavna hai next week, jo 75% se neeche hai. 
            Immediate attention chahiye!
        `;
    } else if (nextWeekClamped < 80) {
        alertDiv.style.display = 'block';
        alertDiv.className = 'prediction-alert';
        alertDiv.innerHTML = `
            <i class="fa-solid fa-chart-line"></i> 
            <strong>Prediction:</strong> ${studentName} ki attendance ${nextWeekClamped.toFixed(1)}% rahegi next week. 
            Threshold (75%) ke kareeb hai, monitor karein.
        `;
    } else {
        alertDiv.style.display = 'none';
    }
}

function renderHeatmap(selectedRoll) {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;
    container.innerHTML = '';
    
    // Get last 90 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    let dateMap = new Map(); // date -> status
    if (selectedRoll === 'all') {
        // For whole class, show overall attendance percentage with color gradient? Better show daily % as color intensity
        // Simpler: show green if >70%, orange if 50-70%, red <50%
        const timeline = getOverallAttendanceTimeline();
        timeline.forEach(item => {
            let percent = item.percentage;
            let colorClass = '';
            if (percent >= 70) colorClass = 'present';
            else if (percent >= 50) colorClass = 'late';
            else colorClass = 'absent';
            dateMap.set(item.date, { status: colorClass, detail: `${percent}%` });
        });
    } else {
        const student = studentsData.find(s => s.roll == selectedRoll);
        if (student && student.attendance) {
            for (let [date, status] of Object.entries(student.attendance)) {
                let colorClass = '';
                if (status === 'Present') colorClass = 'present';
                else if (status === 'Absent') colorClass = 'absent';
                else if (status === 'Late') colorClass = 'late';
                else colorClass = 'no-data';
                dateMap.set(date, { status: colorClass, detail: status });
            }
        }
    }
    
    // Generate calendar grid
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const day = currentDate.getDate();
        const month = currentDate.getMonth()+1;
        const shortDate = `${day}/${month}`;
        const entry = dateMap.get(dateStr);
        let statusClass = 'no-data';
        let tooltip = 'No data';
        if (entry) {
            statusClass = entry.status;
            tooltip = entry.detail;
        }
        const div = document.createElement('div');
        div.className = `heatmap-day ${statusClass}`;
        div.title = `${dateStr}: ${tooltip}`;
        div.innerHTML = `<div class="heatmap-date">${shortDate}</div><div class="heatmap-status">${statusClass === 'present' ? 'P' : statusClass === 'absent' ? 'A' : statusClass === 'late' ? 'L' : 'N'}</div>`;
        container.appendChild(div);
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

function toggleTrendPeriod() {
    currentPeriod = currentPeriod === 'monthly' ? 'weekly' : 'monthly';
    refreshAnalytics();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}