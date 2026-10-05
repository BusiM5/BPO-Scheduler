// 1. Core Data: Employees and Shift Configuration
const staff = [
    { id: 'emp-1', name: 'Sarah Connor', role: 'Tier 1 Support', rate: 20, avatar: 'SC' },
    { id: 'emp-2', name: 'John Smith', role: 'Tier 2 Tech', rate: 25, avatar: 'JS' },
    { id: 'emp-3', name: 'Alice Wong', role: 'Bilingual Agent', rate: 22, avatar: 'AW' },
    { id: 'emp-4', name: 'Marcus Bell', role: 'Tier 1 Support', rate: 20, avatar: 'MB' },
    { id: 'emp-5', name: 'Elena Rostova', role: 'Team Lead', rate: 30, avatar: 'ER' }
];

const shifts = [
    { id: 'day', name: 'Day (8am-4pm)', multiplier: 1.0, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 'swing', name: 'Swing (4pm-12am)', multiplier: 1.1, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'night', name: 'Night (12am-8am)', multiplier: 1.25, color: 'bg-slate-700 text-slate-100 border-slate-800' }
];

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Chart Instance Placeholder
let costChart = null;

// 2. Initialization: Render UI Elements
function initApp() {
    renderStaffPool();
    renderGrid();
    initChart();
    calculateMetrics();
}

function renderStaffPool() {
    const pool = document.getElementById('staff-pool');
    staff.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'draggable bg-white border border-gray-200 rounded-lg p-2 shadow-sm hover:shadow-md transition-all flex items-center space-x-3 mb-2';
        card.draggable = true;
        card.id = emp.id;
        card.dataset.rate = emp.rate;
        card.dataset.source = 'pool'; // Identify where this card came from
        card.ondragstart = drag;
        
        card.innerHTML = `
            <div class="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                ${emp.avatar}
            </div>
            <div class="min-w-0">
                <h4 class="text-sm font-bold text-gray-800 truncate">${emp.name}</h4>
                <p class="text-xs text-gray-500 truncate">${emp.role} • $${emp.rate}/hr</p>
            </div>
        `;
        pool.appendChild(card);
    });
}

function renderGrid() {
    const grid = document.getElementById('schedule-grid');
    shifts.forEach(shift => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-8 border-b border-gray-200 min-h-[140px]';
        
        // Shift Label
        let html = `<div class="${shift.color} p-4 flex items-center justify-center text-center text-sm font-bold border-r">${shift.name}</div>`;
        
        // Drop Zones for each day
        days.forEach(day => {
            const isWeekend = day === 'sat' || day === 'sun';
            const weekendClass = isWeekend ? 'bg-red-50/20' : 'bg-white';
            
            html += `
                <div class="dropzone ${weekendClass} border-r border-gray-200 p-2 flex flex-col gap-2 transition-colors relative" 
                     data-shift="${shift.id}" 
                     data-day="${day}"
                     data-multiplier="${shift.multiplier}"
                     data-weekend="${isWeekend}"
                     ondragover="allowDrop(event)" 
                     ondragenter="dragEnter(event)"
                     ondragleave="dragLeave(event)"
                     ondrop="drop(event, 'grid')">
                </div>
            `;
        });
        row.innerHTML = html;
        grid.appendChild(row);
    });
}

// 3. Drag and Drop Mechanics
function allowDrop(ev) {
    ev.preventDefault(); // Necessary to allow dropping
}

function dragEnter(ev) {
    ev.preventDefault();
    const dropzone = ev.target.closest('.dropzone');
    if(dropzone) dropzone.classList.add('drag-over');
}

function dragLeave(ev) {
    const dropzone = ev.target.closest('.dropzone');
    if(dropzone) dropzone.classList.remove('drag-over');
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.setData("source", ev.target.dataset.source);
}

function drop(ev, targetType) {
    ev.preventDefault();
    const currentTarget = ev.target.closest('.dropzone') || document.getElementById('staff-pool');
    
    // Remove hover styles
    document.querySelectorAll('.dropzone').forEach(el => el.classList.remove('drag-over'));

    const data = ev.dataTransfer.getData("text");
    const source = ev.dataTransfer.getData("source");
    const draggedElement = document.getElementById(data);

    if (!draggedElement) return;

    if (targetType === 'grid') {
        if (source === 'pool') {
            // SCENARIO 1: Dragging from sidebar to grid -> CLONE the element
            const clone = draggedElement.cloneNode(true);
            clone.id = data + '-' + Date.now(); // Give clone a unique ID
            clone.dataset.source = 'grid'; // Mark clone as belonging to the grid
            clone.title = "Double-click to remove shift";
            clone.ondragstart = drag;
            
            // Add double-click to remove functionality
            clone.ondblclick = function() {
                this.remove();
                calculateMetrics();
            };

            // Scale down slightly for grid view
            clone.classList.replace('p-2', 'p-1');
            clone.querySelector('div.h-9').classList.replace('h-9', 'h-7');
            clone.querySelector('div.w-9').classList.replace('w-9', 'w-7');
            clone.querySelector('h4').classList.replace('text-sm', 'text-xs');
            clone.querySelector('p').style.display = 'none'; // Hide rate to save space

            currentTarget.appendChild(clone);
        } else {
            // SCENARIO 2: Dragging from grid to grid -> MOVE the element
            currentTarget.appendChild(draggedElement);
        }
    } else if (targetType === 'pool' && source === 'grid') {
        // SCENARIO 3: Dragging from grid back to pool -> DELETE the element
        draggedElement.remove();
    }

    // Always recalculate costs after a change
    calculateMetrics();
}

// 4. Payroll Calculation & Analytics
function calculateMetrics() {
    let totalCost = 0;
    let dayCost = 0, swingCost = 0, nightCost = 0;
    let filledSlots = 0;
    const totalSlots = shifts.length * days.length; // 21 slots total

    const dropzones = document.querySelectorAll('.dropzone');
    
    dropzones.forEach(zone => {
        const agentsInZone = zone.querySelectorAll('.draggable');
        if (agentsInZone.length > 0) filledSlots++;

        agentsInZone.forEach(agent => {
            const baseRate = parseFloat(agent.dataset.rate);
            const shiftMultiplier = parseFloat(zone.dataset.multiplier);
            const isWeekend = zone.dataset.weekend === "true";
            
            // Payroll Formula: Base * Shift Multiplier * Weekend Multiplier * 8 hours
            const weekendMultiplier = isWeekend ? 1.5 : 1.0;
            const shiftCost = baseRate * shiftMultiplier * weekendMultiplier * 8;
            
            totalCost += shiftCost;

            if (zone.dataset.shift === 'day') dayCost += shiftCost;
            if (zone.dataset.shift === 'swing') swingCost += shiftCost;
            if (zone.dataset.shift === 'night') nightCost += shiftCost;
        });
    });

    // Update UI
    document.getElementById('total-payroll').innerText = `$${totalCost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('coverage-metric').innerText = `${Math.round((filledSlots / totalSlots) * 100)}%`;

    updateChart(dayCost, swingCost, nightCost);
}

// 5. Chart.js Implementation
function initChart() {
    const ctx = document.getElementById('payrollChart').getContext('2d');
    costChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Day Shift', 'Swing Shift', 'Night Shift'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#facc15', '#fb923c', '#334155'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            },
            cutout: '75%'
        }
    });
}

function updateChart(day, swing, night) {
    if (!costChart) return;
    
    // If all are zero, show empty chart state (gray) to prevent visual glitches
    if (day === 0 && swing === 0 && night === 0) {
        costChart.data.datasets[0].data = [1];
        costChart.data.datasets[0].backgroundColor = ['#f1f5f9']; 
        costChart.options.plugins.tooltip.enabled = false;
    } else {
        costChart.data.datasets[0].data = [day, swing, night];
        costChart.data.datasets[0].backgroundColor = ['#facc15', '#fb923c', '#334155'];
        costChart.options.plugins.tooltip.enabled = true;
    }
    
    costChart.update();
}

// Boot the app
document.addEventListener('DOMContentLoaded', initApp);