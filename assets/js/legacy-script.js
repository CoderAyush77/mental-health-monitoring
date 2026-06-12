const ctx = document.getElementById('moodChart');

new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
            data: [60,72,50,76,65,92,80],
            borderColor: '#4c8752',
            backgroundColor: 'rgba(76,135,82,.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 5
        }]
    },
    options: {
        plugins: {
            legend: {
                display:false
            }
        },
        responsive:true,
        maintainAspectRatio:false,
        scales:{
            y:{
                min:0,
                max:100
            }
        }
    }
});