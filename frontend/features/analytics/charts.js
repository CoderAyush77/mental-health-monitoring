document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // Configuration
    // ==========================================
    const email = localStorage.getItem("email");

    if (!email) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    const API_BASE = `http://127.0.0.1:5000/analytics/${email}`;

    // ==========================================
    // Header Date
    // ==========================================
    const headerDateSpan = document.getElementById("headerDateSpan");

    if (headerDateSpan) {
        const today = new Date();

        headerDateSpan.textContent = today.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    // ==========================================
    // Global Variables
    // ==========================================
    let dashboardData = null;
    let donutChart = null;
    let trendChart = null;

    const emotionLabels = [
        "anger",
        "disgust",
        "fear",
        "joy",
        "neutral",
        "sadness",
        "surprise"
    ];

    const emotionColors = [
        "#e53e3e",
        "#718096",
        "#dd6b20",
        "#38a169",
        "#3182ce",
        "#805ad5",
        "#d53f8c"
    ];

    // ==========================================
    // Emotion Doughnut Chart
    // ==========================================
    const emotionCtx = document
        .getElementById("emotionDonut")
        .getContext("2d");

    donutChart = new Chart(emotionCtx, {

        type: "doughnut",

        data: {
            labels: emotionLabels,
            datasets: [{
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: emotionColors,
                borderWidth: 0,
                cutout: "70%"
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            }
        }

    });

    // ==========================================
    // Custom Legend
    // ==========================================
    function renderLegend(values) {

        const legend = document.getElementById("donutLegend");

        legend.innerHTML = "";

        emotionLabels.forEach((label, index) => {

            const row = document.createElement("div");

            row.className = "legend-row";

            row.innerHTML = `
                <div class="legend-label">
                    <span
                        class="legend-dot"
                        style="background:${emotionColors[index]}"
                    ></span>

                    ${label}
                </div>

                <div class="legend-val">
                    ${Number(values[index]).toFixed(2)}%
                </div>
            `;

            legend.appendChild(row);

        });

    }

    renderLegend([0, 0, 0, 0, 0, 0, 0]);

        // ==========================================
    // Load Text Analysis
    // ==========================================
    async function loadTextAnalysis(id) {

        try {

            const response = await fetch(
                `${BASE_URL}/analytics/${email}/analysis?type=text&id=${id}`
            );

            const data = await response.json();

            // Stress Level
            const stress = document.getElementById("textStressVal");

            stress.textContent = data.stress;
            stress.className = "metric-val";

            if (data.stress === "Low") {
                stress.classList.add("color-green");
            } else if (
                data.stress === "Medium" ||
                data.stress === "Moderate"
            ) {
                stress.classList.add("color-orange");
            } else {
                stress.classList.add("color-red");
            }

            // Emotion Doughnut
            const emotionData = emotionLabels.map(label =>
                Number(data.emotions[label] || 0).toFixed(2)
            );

            donutChart.data.datasets[0].data = emotionData;
            donutChart.update();

            renderLegend(emotionData);

        } catch (err) {
            console.error("Text Analysis Error:", err);
        }

    }

    // ==========================================
    // Load Voice Analysis
    // ==========================================
    async function loadVoiceAnalysis(id) {

        try {

            const response = await fetch(
                `${BASE_URL}/analytics/${email}/analysis?type=voice&id=${id}`
            );

            const data = await response.json();

            // Stress Level
            const stress = document.getElementById("voiceStressVal");

            stress.textContent = data.stress;
            stress.className = "metric-badge";

            if (data.stress === "Low") {
                stress.classList.add("bg-green-light", "color-green");
            } else {
                stress.classList.add("badge-red");
            }

            // Confidence
            document.getElementById("voiceConfidenceVal").textContent =
                `${Number(data.confidence).toFixed(2)}%`;

            // Positivity
            document.getElementById("voicePositivityVal").textContent =
                `${Number(data.positivity).toFixed(2)}/100`;

            // Recommendation
            document.getElementById("voiceRecText1").textContent =
                data.recommendation.line1;

            document.getElementById("voiceRecText2").textContent =
                data.recommendation.line2;

        } catch (err) {
            console.error("Voice Analysis Error:", err);
        }

    }

    // ==========================================
    // Dropdown Change Events
    // ==========================================
    textSelect.addEventListener("change", function () {
        loadTextAnalysis(this.value);
    });

    voiceSelect.addEventListener("change", function () {
        loadVoiceAnalysis(this.value);
    });

    // ==========================================
    // Load Latest Entries Automatically
    // ==========================================
    if (dashboard.text_history.length > 0) {
        loadTextAnalysis(dashboard.text_history[0].id);
    }

    if (dashboard.voice_history.length > 0) {
        loadVoiceAnalysis(dashboard.voice_history[0].id);
    }
        // ==========================================
    // Stress Trend Line Chart
    // ==========================================

    const trendCtx = document
        .getElementById("stressTrendLine")
        .getContext("2d");

    trendChart = new Chart(trendCtx, {

        type: "line",

        data: {

            labels: dashboard.stress_trend.days,

            datasets: [

                {
                    label: "Voice",
                    data: dashboard.stress_trend.voice,
                    borderColor: "#38a169",
                    backgroundColor: "#38a169",
                    pointBackgroundColor: "#38a169",
                    borderWidth: 2,
                    tension: 0,
                    spanGaps: true
                },

                {
                    label: "Text",
                    data: dashboard.stress_trend.text,
                    borderColor: "#805ad5",
                    backgroundColor: "#805ad5",
                    pointBackgroundColor: "#805ad5",
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0,
                    spanGaps: true
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            layout: {
                padding: {
                    bottom: 20
                }
            },

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {

                y: {

                    min: 0.5,
                    max: 4.5,

                    ticks: {

                        stepSize: 1,

                        callback: function (value) {

                            if (value === 1) return "Low";
                            if (value === 2) return "Medium";
                            if (value === 3) return "High";
                            if (value === 4) return "Extreme";

                            return "";

                        },

                        color: function (context) {

                            if (context.tick.value === 1)
                                return "#38a169";

                            if (context.tick.value === 2)
                                return "#dd6b20";

                            if (context.tick.value === 3)
                                return "#e53e3e";

                            if (context.tick.value === 4)
                                return "#e53e3e";

                            return "#718096";

                        },

                        font: {
                            weight: "bold"
                        }

                    },

                    grid: {
                        color: "#edf2f7",
                        drawBorder: false
                    }

                },

                x: {

                    grid: {
                        display: false,
                        drawBorder: true,
                        borderColor: "#cbd5e1"
                    },

                    ticks: {
                        color: "#718096"
                    }

                }

            }

        },

        plugins: [{

            id: "customXAxisLabel",

            afterDraw(chart) {

                const ctx = chart.ctx;

                ctx.save();

                ctx.font = "11px Poppins";

                ctx.textAlign = "center";

                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                const textY = yAxis.bottom + 35;
                const textX = (xAxis.left + xAxis.right) / 2;

                const part0 = "Extreme = 4 (Text), ";
                const part1 = "High = 3, ";
                const part2 = "Medium = 2, ";
                const part3 = "Low = 1";

                let currentX = textX - 140;

                ctx.fillStyle = "#c53030";
                ctx.fillText(
                    part0,
                    currentX + ctx.measureText(part0).width / 2,
                    textY
                );

                currentX += ctx.measureText(part0).width;

                ctx.fillStyle = "#e53e3e";
                ctx.fillText(
                    part1,
                    currentX + ctx.measureText(part1).width / 2,
                    textY
                );

                currentX += ctx.measureText(part1).width;

                ctx.fillStyle = "#dd6b20";
                ctx.fillText(
                    part2,
                    currentX + ctx.measureText(part2).width / 2,
                    textY
                );

                currentX += ctx.measureText(part2).width;

                ctx.fillStyle = "#38a169";
                ctx.fillText(
                    part3,
                    currentX + ctx.measureText(part3).width / 2,
                    textY
                );

                ctx.restore();

            }

        }]

    });

});