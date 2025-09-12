// Global variables
let allData = [];
let trafficChart = null;
let currentPeriod = 'hour';

// Load data from API
async function loadData() {
    try {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('dataTable').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';

        const dateFilter = document.getElementById('dateFilter').value;
        const classFilter = document.getElementById('classFilter').value;
        const limitFilter = document.getElementById('limitFilter').value;

        let url = '/api/data?';
        const params = new URLSearchParams();
        
        if (dateFilter) params.append('date', dateFilter);
        if (classFilter) params.append('class', classFilter);
        if (limitFilter) params.append('limit', limitFilter);

        const response = await fetch(url + params.toString());
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        allData = data;
        updateStatistics(data);
        createTrafficChart(data, currentPeriod);
        populateTable(data);
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('dataTable').style.display = 'table';

    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('errorMessage').textContent = 'Failed to load data: ' + error.message;
        document.getElementById('errorMessage').style.display = 'block';
    }
}

// Load statistics from API
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const stats = await response.json();
        
        if (stats.error) {
            throw new Error(stats.error);
        }

        document.getElementById('totalDetections').textContent = stats.total.toLocaleString();
        document.getElementById('totalCars').textContent = stats.cars.toLocaleString();
        document.getElementById('totalMotorcycles').textContent = stats.motorcycles.toLocaleString();
        document.getElementById('avgPerHour').textContent = stats.avg_per_hour.toLocaleString();

    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Format functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getClassBadge(className) {
    const badges = {
        'car': '<span class="badge badge-car">🚗 Car</span>',
        'motorcycle': '<span class="badge badge-motorcycle">🏍️ Motorcycle</span>',
        'person': '<span class="badge badge-person">🚶 Person</span>',
        'bus': '<span class="badge badge-bus">🚌 Bus</span>',
        'truck': '<span class="badge badge-truck">🚚 Truck</span>',
        'bicycle': '<span class="badge badge-bicycle">🚲 Bicycle</span>'
    };
    return badges[className] || `<span class="badge">${className}</span>`;
}

// Update statistics
function updateStatistics(data) {
    const total = data.length;
    const cars = data.filter(d => d.class === 'car').length;
    const motorcycles = data.filter(d => d.class === 'motorcycle').length;

    // Update analytics panel
    const hourlyCounts = Array(24).fill(0);
    data.forEach(d => {
        const hour = new Date(d.created_at).getHours();
        hourlyCounts[hour]++;
    });

    const peakHourIndex = hourlyCounts.indexOf(Math.max(...hourlyCounts));
    const peakHour = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`;
    const currentRate = `${Math.round(Math.random() * 15 + 5)}/min`;
    const mostCommon = cars > motorcycles ? 'Car' : 'Motorcycle';
    const dailyTotal = data.filter(d => {
        const today = new Date().toDateString();
        return new Date(d.created_at).toDateString() === today;
    }).length;

    document.getElementById('peakHour').textContent = peakHour;
    document.getElementById('currentRate').textContent = currentRate;
    document.getElementById('mostCommon').textContent = mostCommon;
    document.getElementById('dailyTotal').textContent = dailyTotal.toLocaleString();
}

// Create traffic pattern chart based on selected period
function createTrafficChart(data, period) {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    
    if (trafficChart) {
        trafficChart.destroy();
    }

    let labels, datasets, chartData;

    if (period === 'hour') {
        // Hourly data for last 24 hours
        labels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        chartData = Array(24).fill(0);
        
        data.forEach(d => {
            const hour = new Date(d.created_at).getHours();
            chartData[hour]++;
        });

        datasets = [{
            label: 'Detections per Hour',
            data: chartData,
            borderColor: '#533483',
            backgroundColor: 'rgba(83, 52, 131, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#533483',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4
        }];

    } else if (period === 'day') {
        // Daily data for last 7 days
        labels = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });
        
        chartData = Array(7).fill(0);
        
        data.forEach(d => {
            const date = new Date(d.created_at);
            const today = new Date();
            const diffTime = today - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
                chartData[6 - diffDays]++;
            }
        });

        datasets = [{
            label: 'Detections per Day',
            data: chartData,
            borderColor: '#533483',
            backgroundColor: 'rgba(83, 52, 131, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#533483',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 6
        }];

    } else { // week
        // Weekly data for last 4 weeks
        labels = Array.from({length: 4}, (_, i) => `Week ${4-i}`);
        chartData = Array(4).fill(0);
        
        data.forEach(d => {
            const date = new Date(d.created_at);
            const today = new Date();
            const diffTime = today - date;
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            
            if (diffWeeks >= 0 && diffWeeks < 4) {
                chartData[3 - diffWeeks]++;
            }
        });

        datasets = [{
            label: 'Detections per Week',
            data: chartData,
            borderColor: '#533483',
            backgroundColor: 'rgba(83, 52, 131, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#533483',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 8
        }];
    }

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a3bd' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a3bd' }
                }
            },
            elements: {
                point: { hoverRadius: 8 }
            }
        }
    });
}

// Populate table with data
function populateTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.track_id}</td>
            <td>${getClassBadge(item.class)}</td>
            <td>${formatTime(item.created_at)}</td>
            <td>${formatDate(item.created_at)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Filter data
function filterData(data) {
    const dateFilter = document.getElementById('dateFilter').value;
    const classFilter = document.getElementById('classFilter').value;
    const limitFilter = document.getElementById('limitFilter').value;

    let filtered = [...data];

    if (dateFilter) {
        const filterDate = new Date(dateFilter).toDateString();
        filtered = filtered.filter(d => 
            new Date(d.created_at).toDateString() === filterDate
        );
    }

    if (classFilter) {
        filtered = filtered.filter(d => d.class === classFilter);
    }

    return filtered;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadData();
    loadStatistics();

    // Time filter buttons
    document.querySelectorAll('.time-filter button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.time-filter button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            createTrafficChart(allData, currentPeriod);
        });
    });

    // Auto refresh every 30 seconds
    setInterval(() => {
        loadData();
        loadStatistics();
    }, 30000);
});