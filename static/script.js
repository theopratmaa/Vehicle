// Global variables
let allData = [];
let trafficChart = null;
let currentPeriod = 'hour';

// Generate sample data with more realistic patterns
function generateSampleData() {
    const classes = ['car', 'motorcycle', 'person', 'bus', 'truck', 'bicycle'];
    const weights = [0.4, 0.3, 0.15, 0.05, 0.06, 0.04]; // Realistic distribution
    const sampleData = [];
    
    for (let i = 0; i < 500; i++) {
        const now = new Date();
        const randomHoursAgo = Math.floor(Math.random() * 168); // Last week
        const createdAt = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000));
        
        // Create traffic patterns (more during day hours)
        const hour = createdAt.getHours();
        const dayMultiplier = (hour >= 6 && hour <= 22) ? 3 : 0.5;
        const rushHourMultiplier = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 2 : 1;
        
        const shouldInclude = Math.random() < (0.3 * dayMultiplier * rushHourMultiplier);
        if (!shouldInclude && i < 400) continue; // Skip some to create realistic patterns
        
        // Weighted random selection for vehicle type
        let random = Math.random();
        let selectedClass = classes[0];
        let cumulativeWeight = 0;
        
        for (let j = 0; j < classes.length; j++) {
            cumulativeWeight += weights[j];
            if (random <= cumulativeWeight) {
                selectedClass = classes[j];
                break;
            }
        }
        
        sampleData.push({
            track_id: Math.floor(Math.random() * 50000),
            class: selectedClass,
            created_at: createdAt.toISOString()
        });
    }
    
    return sampleData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
    return `<span class="class-badge class-${className}">${className}</span>`;
}

// Update statistics
function updateStatistics(data) {
    const total = data.length;
    const cars = data.filter(d => d.class === 'car').length;
    const motorcycles = data.filter(d => d.class === 'motorcycle').length;
    const avgPerHour = Math.round(total / 24);

    document.getElementById('totalDetections').textContent = total.toLocaleString();
    document.getElementById('totalCars').textContent = cars.toLocaleString();
    document.getElementById('totalMotorcycles').textContent = motorcycles.toLocaleString();
    document.getElementById('avgPerHour').textContent = avgPerHour.toLocaleString();

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
}