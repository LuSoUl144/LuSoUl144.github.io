document.addEventListener('DOMContentLoaded', () => {
    // --- Slides Navigation ---
    const slides = document.querySelectorAll('main section');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentSlide = 0;

    // --- Sensor and Chart State ---
    const startStopButton = document.getElementById('startStopButton');
    const permissionStatus = document.getElementById('permissionStatus');
    
    let chart = null; // 차트 변수, 초기에는 null
    let isChartInitialized = false; // 차트 초기화 여부 플래그
    let sensor, motionListener;
    let isRunning = false;
    let lastReading = { x: 0, y: 0, z: 0 };
    let animationFrameId;

    // --- Chart Initialization Function ---
    function initializeChart() {
        if (isChartInitialized) return; // 이미 초기화되었으면 실행 안 함

        const ctx = document.getElementById('accelerometerChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'X', borderColor: '#ff6384', data: [], fill: false, tension: 0.2 },
                    { label: 'Y', borderColor: '#36a2eb', data: [], fill: false, tension: 0.2 },
                    { label: 'Z', borderColor: '#4bc0c0', data: [], fill: false, tension: 0.2 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 200 // 부드러운 애니메이션 효과 추가
                },
                plugins: { legend: { labels: { color: '#e0e0e0' } } },
                scales: {
                    x: { title: { display: true, text: 'Time', color: '#e0e0e0' }, ticks: { color: '#e0e0e0', maxTicksLimit: 10 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { title: { display: true, text: 'Acceleration (m/s²)', color: '#e0e0e0' }, suggestedMin: -15, suggestedMax: 15, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
        isChartInitialized = true;
    }

    // --- Slide Display Logic ---
    function showSlide(index) {
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === slides.length - 1;

        // ** 핵심: 데모 슬라이드가 활성화될 때 차트를 초기화합니다. **
        if (slides[index].id === 'demo') {
            initializeChart();
        }
    }

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) showSlide(--currentSlide);
    });
    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) showSlide(++currentSlide);
    });
    showSlide(currentSlide); // 초기 슬라이드 표시

    // --- Sensor Logic ---
    function updateChart() {
        if (!isChartInitialized) return; // 차트가 없으면 업데이트 안 함

        const time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(lastReading.x);
        chart.data.datasets[1].data.push(lastReading.y);
        chart.data.datasets[2].data.push(lastReading.z);

        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        chart.update('none');
        animationFrameId = requestAnimationFrame(updateChart);
    }

    function stopSensor() {
        if (sensor && typeof sensor.stop === 'function') {
            sensor.removeEventListener('reading', handleSensorReading);
            sensor.stop();
            sensor = null;
        }
        if (motionListener) {
            window.removeEventListener('devicemotion', motionListener);
            motionListener = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isRunning = false;
        startStopButton.textContent = '실시간 데이터 측정 시작';
        permissionStatus.textContent = '센서가 비활성화되었습니다.';
    }

    const handleSensorReading = () => {
        if (sensor) lastReading = { x: sensor.x, y: sensor.y, z: sensor.z };
    };

    const handleDeviceMotion = (event) => {
        const accel = event.accelerationIncludingGravity || event.acceleration;
        if (accel && typeof accel.x === 'number') {
            lastReading = { x: accel.x, y: accel.y, z: accel.z };
        }
    };

    function startSensor() {
        if (!isChartInitialized) {
            permissionStatus.textContent = '차트가 준비되지 않았습니다. 슬라이드를 다시 방문해주세요.';
            return;
        }

        if ('LinearAccelerationSensor' in window) {
            // ... (Generic Sensor API logic - unchanged) ...
        } else if (typeof DeviceMotionEvent !== 'undefined') {
            motionListener = handleDeviceMotion;
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                DeviceMotionEvent.requestPermission().then(state => {
                    if (state === 'granted') {
                        window.addEventListener('devicemotion', motionListener);
                        isRunning = true;
                        startStopButton.textContent = '실시간 데이터 측정 중지';
                        permissionStatus.textContent = '센서 활성화됨. 폰을 움직여보세요.';
                        animationFrameId = requestAnimationFrame(updateChart);
                    } else {
                        permissionStatus.textContent = '센서 사용 권한이 거부되었습니다.';
                    }
                }).catch(e => permissionStatus.textContent = `권한 오류: ${e.message}`);
            } else {
                window.addEventListener('devicemotion', motionListener);
                isRunning = true;
                startStopButton.textContent = '실시간 데이터 측정 중지';
                permissionStatus.textContent = '센서 활성화됨. 폰을 움직여보세요.';
                animationFrameId = requestAnimationFrame(updateChart);
            }
        } else {
            permissionStatus.textContent = '이 기기에서는 가속도 센서를 지원하지 않습니다.';
        }
    }

    startStopButton.addEventListener('click', () => {
        if (isRunning) {
            stopSensor();
        } else {
            startSensor();
        }
    });
});
