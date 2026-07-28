document.addEventListener('DOMContentLoaded', () => {
            // Set Header Date to Today
            const headerDateSpan = document.getElementById('headerDateSpan');
            if (headerDateSpan) {
                const today = new Date();
                const options = { month: 'short', day: 'numeric', year: 'numeric' };
                headerDateSpan.textContent = today.toLocaleDateString('en-US', options);
            }

            // 1. Emotion Distribution Doughnut Chart
            const emotionCtx = document.getElementById('emotionDonut').getContext('2d');

            const emotionLabels = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
            let emotionData = [0.2, 0.1, 0.2, 0.1, 0.4, 98.8, 0.2]; // percentages
            const emotionColors = ['#e53e3e', '#718096', '#dd6b20', '#38a169', '#3182ce', '#805ad5', '#d53f8c'];

            let donutChart = new Chart(emotionCtx, {
                type: 'doughnut',
                data: {
                    labels: emotionLabels,
                    datasets: [{
                        data: emotionData,
                        backgroundColor: emotionColors,
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.label + ': ' + context.parsed + '%';
                                }
                            }
                        }
                    }
                }
            });

            const legendContainer = document.getElementById('donutLegend');

            // Function to render custom legend
            const renderLegend = (data) => {
                legendContainer.innerHTML = ''; // clear existing
                emotionLabels.forEach((label, index) => {
                    const val = data[index];
                    const color = emotionColors[index];

                    const item = document.createElement('div');
                    item.className = 'legend-row';
                    item.innerHTML = `
                    <div class="legend-label">
                        <span class="legend-dot" style="background-color: ${color}"></span>
                        ${label}
                    </div>
                    <div class="legend-val">${val}%</div>
                `;
                    legendContainer.appendChild(item);
                });
            };


            renderLegend(emotionData);

            // --- DYNAMIC DROPDOWN POPULATION ---
            // Scenario: User alternates text and voice entries to provide rich data for the chart
            const textHistorySelect = document.getElementById('textHistorySelect');
            const voiceHistorySelect = document.getElementById('voiceHistorySelect');

            const userTextEntries = [
                { id: 'jul22', label: 'Jul 22, 2025' },
                { id: 'jul20', label: 'Jul 20, 2025' },
                { id: 'jul18', label: 'Jul 18, 2025' },
                { id: 'jul16', label: 'Jul 16, 2025' }
            ];

            const userVoiceEntries = [
                { id: 'jul21', label: 'Jul 21, 2025' },
                { id: 'jul19', label: 'Jul 19, 2025' },
                { id: 'jul17', label: 'Jul 17, 2025' }
            ];

            // Populate Text Dropdown
            userTextEntries.forEach((entry, index) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = index === 0 ? `${entry.label} (Latest)` : entry.label;
                textHistorySelect.appendChild(option);
            });

            // Populate Voice Dropdown
            userVoiceEntries.forEach((entry, index) => {
                const option = document.createElement('option');
                option.value = entry.id;
                option.textContent = index === 0 ? `${entry.label} (Latest)` : entry.label;
                voiceHistorySelect.appendChild(option);
            });

            // Handle Text History Dropdown Change
            textHistorySelect.addEventListener('change', (e) => {
                const selectedDate = e.target.value;

                // Mock dynamic data based on selection
                let newData = [];
                if (selectedDate === 'jul22') {
                    document.getElementById('textStressVal').textContent = 'Extreme';
                    document.getElementById('textStressVal').className = 'metric-val color-red';
                    document.getElementById('textConfidenceVal').textContent = '98.77%';
                    document.getElementById('textSentimentVal').textContent = '-0.92';
                    newData = [0.2, 0.1, 0.2, 0.1, 0.4, 98.8, 0.2]; // High sadness
                } else if (selectedDate === 'jul20') {
                    document.getElementById('textStressVal').textContent = 'Medium';
                    document.getElementById('textStressVal').className = 'metric-val color-orange';
                    document.getElementById('textConfidenceVal').textContent = '85.20%';
                    document.getElementById('textSentimentVal').textContent = '-0.12';
                    newData = [10.5, 2.1, 5.0, 15.2, 50.4, 15.3, 1.5]; // More neutral
                } else if (selectedDate === 'jul18') {
                    document.getElementById('textStressVal').textContent = 'Low';
                    document.getElementById('textStressVal').className = 'metric-val color-green';
                    document.getElementById('textConfidenceVal').textContent = '92.11%';
                    document.getElementById('textSentimentVal').textContent = '0.85';
                    newData = [1.2, 0.5, 2.0, 75.8, 15.4, 3.1, 2.0]; // High joy
                } else {
                    document.getElementById('textStressVal').textContent = 'High';
                    document.getElementById('textStressVal').className = 'metric-val color-red';
                    document.getElementById('textConfidenceVal').textContent = '88.90%';
                    document.getElementById('textSentimentVal').textContent = '-0.65';
                    newData = [45.2, 5.1, 10.2, 2.1, 20.4, 15.0, 2.0]; // High anger
                }

                // Update Chart
                donutChart.data.datasets[0].data = newData;
                donutChart.update();

                // Update Legend
                renderLegend(newData);
            });

            // Handle Voice History Dropdown Change
            voiceHistorySelect.addEventListener('change', (e) => {
                const selectedDate = e.target.value;

                const stressVal = document.getElementById('voiceStressVal');
                const confVal = document.getElementById('voiceConfidenceVal');
                const posVal = document.getElementById('voicePositivityVal');
                const recBox = document.getElementById('voiceRecBox');
                const recIcon = document.getElementById('voiceRecIcon');
                const recText1 = document.getElementById('voiceRecText1');
                const recText2 = document.getElementById('voiceRecText2');

                if (selectedDate === 'jul18') {
                    stressVal.textContent = 'High';
                    stressVal.className = 'metric-badge badge-red';
                    confVal.textContent = '57.54%';
                    posVal.textContent = '44.37/100';

                    recBox.className = 'recommendation-box bg-green-light';
                    recIcon.className = 'fa-solid fa-bullhorn icon-green';
                    recText1.textContent = 'Your voice shows moderate positivity.';
                    recText2.textContent = 'Keep expressing yourself!';
                } else if (selectedDate === 'jul19') {
                    stressVal.textContent = 'Extreme';
                    stressVal.className = 'metric-badge badge-red';
                    confVal.textContent = '82.10%';
                    posVal.textContent = '12.50/100';

                    recBox.className = 'recommendation-box insight-red';
                    recIcon.className = 'fa-solid fa-circle-exclamation icon-red';
                    recText1.textContent = 'Your voice indicates high distress.';
                    recText2.textContent = 'Please consider a breathing exercise.';
                } else if (selectedDate === 'jul17') {
                    stressVal.textContent = 'Low';
                    stressVal.className = 'metric-badge bg-green-light color-green';
                    confVal.textContent = '90.20%';
                    posVal.textContent = '88.90/100';

                    recBox.className = 'recommendation-box bg-green-light';
                    recIcon.className = 'fa-solid fa-star icon-green';
                    recText1.textContent = 'Your voice sounds very positive!';
                    recText2.textContent = 'You are having a great day!';
                }
            });

            // 2. Stress Trend Line Chart (Last 7 Days)
            const trendCtx = document.getElementById('stressTrendLine').getContext('2d');

            const days = ["Jul 16", "Jul 17", "Jul 18", "Jul 19", "Jul 20", "Jul 21", "Jul 22"];

            // Map: 1 = Low, 2 = Medium, 3 = High, 4 = Extreme
            // Scenario: User alternates between journal and voice on different days
            const textData = [1, null, 4, null, 2, null, 2];
            const voiceData = [null, 1, null, 3, null, 1, null];

            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: "Voice",
                            data: voiceData,
                            borderColor: '#38a169',
                            backgroundColor: '#38a169',
                            pointBackgroundColor: '#38a169',
                            borderWidth: 2,
                            tension: 0, // Straight lines as per image
                            spanGaps: true
                        },
                        {
                            label: "Text",
                            data: textData,
                            borderColor: '#805ad5',
                            backgroundColor: '#805ad5',
                            pointBackgroundColor: '#805ad5',
                            borderWidth: 2,
                            borderDash: [5, 5], // dashed line
                            tension: 0,
                            spanGaps: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { bottom: 20 }
                    },
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            min: 0.5,
                            max: 4.5,
                            ticks: {
                                stepSize: 1,
                                callback: function (value) {
                                    if (value === 1) return 'Low';
                                    if (value === 2) return 'Medium';
                                    if (value === 3) return 'High';
                                    if (value === 4) return 'Extreme';
                                    return '';
                                },
                                color: function (context) {
                                    if (context.tick.value === 1) return '#38a169'; // Low: Green
                                    if (context.tick.value === 2) return '#dd6b20'; // Medium: Orange
                                    if (context.tick.value === 3) return '#e53e3e'; // High: Red
                                    if (context.tick.value === 4) return '#e53e3e'; // Extreme: Red
                                    return '#718096';
                                },
                                font: { weight: 'bold' }
                            },
                            grid: {
                                color: '#edf2f7',
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false,
                                drawBorder: true,
                                borderColor: '#cbd5e1'
                            },
                            ticks: { color: '#718096' }
                        }
                    }
                },
                plugins: [{
                    id: 'customXAxisLabel',
                    afterDraw: (chart) => {
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.font = '11px Poppins, sans-serif';
                        ctx.textAlign = 'center';

                        const xAxis = chart.scales.x;
                        const yAxis = chart.scales.y;

                        // Draw labels at the bottom center
                        const textY = yAxis.bottom + 35;
                        const textX = (xAxis.left + xAxis.right) / 2;

                        const part0 = "Extreme = 4 (Text), ";
                        const part1 = "High = 3, ";
                        const part2 = "Medium = 2, ";
                        const part3 = "Low = 1";

                        let currentX = textX - 140; // shift left to center the longer string
                        
                        ctx.fillStyle = '#c53030'; // Dark red for extreme
                        ctx.fillText(part0, currentX + ctx.measureText(part0).width / 2, textY);
                        currentX += ctx.measureText(part0).width;

                        ctx.fillStyle = '#e53e3e'; // Red for high
                        ctx.fillText(part1, currentX + ctx.measureText(part1).width / 2, textY);
                        currentX += ctx.measureText(part1).width;

                        ctx.fillStyle = '#dd6b20'; // Orange for medium
                        ctx.fillText(part2, currentX + ctx.measureText(part2).width / 2, textY);
                        currentX += ctx.measureText(part2).width;

                        ctx.fillStyle = '#38a169'; // Green for low
                        ctx.fillText(part3, currentX + ctx.measureText(part3).width / 2, textY);

                        ctx.restore();
                    }
                }]
            });
        });