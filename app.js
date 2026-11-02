/**
 * ВІДЕО-ПЛЕЄР У ФОТОРАМЦІ
 * Чисте відтворення відео з папки (video.mp4) у телефонному форматі 9:16
 */

document.addEventListener('DOMContentLoaded', () => {
  const video = document.getElementById('mainVideo');
  const screenViewport = document.getElementById('screenViewport');
  const placeholderOverlay = document.getElementById('placeholderOverlay');

  // Елементи керування плеєром
  const videoControls = document.getElementById('videoControls');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIndicator = document.getElementById('playIndicator');
  const progressContainer = document.getElementById('progressContainer');
  const progressFilled = document.getElementById('progressFilled');
  const progressBuffered = document.getElementById('progressBuffered');
  const progressThumb = document.getElementById('progressThumb');
  const timeDisplay = document.getElementById('timeDisplay');
  const btnMute = document.getElementById('btnMute');
  const volumeSlider = document.getElementById('volumeSlider');
  const btnLoop = document.getElementById('btnLoop');
  const btnFullscreen = document.getElementById('btnFullscreen');

  let controlsTimeout;
  let isDraggingProgress = false;
  let isVideoLoaded = false;
  let checkInterval = null;

  // ==========================================
  // 1. ПЕРЕВІРКА ТА ЗАВАНТАЖЕННЯ ВІДЕО З ПАПКИ
  // ==========================================

  function onVideoSuccess() {
    isVideoLoaded = true;
    placeholderOverlay.classList.add('hidden');
    updateTimeDisplay();
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  video.addEventListener('loadeddata', onVideoSuccess);
  video.addEventListener('loadedmetadata', onVideoSuccess);
  video.addEventListener('canplay', onVideoSuccess);

  // Якщо відео вже завантажилося до спрацьовування слухачів
  if (video.readyState >= 1) {
    onVideoSuccess();
  }

  video.addEventListener('error', () => {
    if (!isVideoLoaded) {
      placeholderOverlay.classList.remove('hidden');
    }
  });

  // Автоматична перевірка: якщо сторінка була відкрита до додавання файлу
  const candidateFiles = ['video.mp4', 'video.MOV', 'video.mov'];
  let candidateIndex = 0;

  checkInterval = setInterval(() => {
    if (isVideoLoaded) {
      clearInterval(checkInterval);
      return;
    }

    const testFile = candidateFiles[candidateIndex % candidateFiles.length];
    candidateIndex++;

    try {
      fetch(testFile, { method: 'HEAD' })
        .then(res => {
          if (res.ok && !isVideoLoaded) {
            video.src = testFile;
            video.load();
          }
        })
        .catch(() => {});
    } catch (e) {}
  }, 2000);

  // Також підтримуємо Drag & Drop файлу прямо на вікно (як додатковий зручний спосіб)
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      video.src = URL.createObjectURL(file);
      video.load();
      onVideoSuccess();
      video.play().catch(() => {});
    }
  });

  // ==========================================
  // 2. ВІДТВОРЕННЯ / ПАУЗА ТА СПЛАШ
  // ==========================================

  function togglePlayPause() {
    if (!isVideoLoaded && video.readyState < 2) return;
    if (video.paused || video.ended) {
      video.play();
    } else {
      video.pause();
    }
  }

  function showPlayIndicator(isPlay) {
    playIndicator.classList.remove('show-play', 'show-pause', 'animate');
    void playIndicator.offsetWidth; // Force reflow
    playIndicator.classList.add(isPlay ? 'show-play' : 'show-pause', 'animate');
    setTimeout(() => {
      playIndicator.classList.remove('animate');
    }, 450);
  }

  screenViewport.addEventListener('click', (e) => {
    if (e.target.closest('#videoControls') || e.target.closest('#placeholderOverlay')) return;
    togglePlayPause();
  });

  btnPlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  video.addEventListener('play', () => {
    screenViewport.classList.remove('paused');
    screenViewport.classList.add('playing');
    showPlayIndicator(true);
    resetControlsTimeout();
  });

  video.addEventListener('pause', () => {
    screenViewport.classList.remove('playing');
    screenViewport.classList.add('paused');
    showPlayIndicator(false);
  });

  // ==========================================
  // 3. ПРОГРЕС БАР ТА ЧАС
  // ==========================================

  function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updateTimeDisplay() {
    const cur = formatTime(video.currentTime);
    const dur = formatTime(video.duration);
    timeDisplay.textContent = `${cur} / ${dur}`;
  }

  video.addEventListener('timeupdate', () => {
    if (!isDraggingProgress && video.duration) {
      const percentage = (video.currentTime / video.duration) * 100;
      progressFilled.style.width = `${percentage}%`;
      progressThumb.style.left = `${percentage}%`;
      updateTimeDisplay();
    }
  });

  video.addEventListener('progress', () => {
    if (video.buffered.length > 0 && video.duration) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const percentage = (bufferedEnd / video.duration) * 100;
      progressBuffered.style.width = `${percentage}%`;
    }
  });

  function seekTo(e) {
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (video.duration) {
      video.currentTime = pos * video.duration;
      progressFilled.style.width = `${pos * 100}%`;
      progressThumb.style.left = `${pos * 100}%`;
    }
  }

  progressContainer.addEventListener('mousedown', (e) => {
    isDraggingProgress = true;
    seekTo(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingProgress) seekTo(e);
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingProgress) isDraggingProgress = false;
  });

  // ==========================================
  // 4. ГУЧНІСТЬ, ПОВТОР ТА ПОВНИЙ ЕКРАН
  // ==========================================

  btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.muted) {
      video.muted = false;
      video.volume = volumeSlider.value > 0 ? volumeSlider.value : 1;
      screenViewport.classList.remove('muted');
    } else {
      video.muted = true;
      screenViewport.classList.add('muted');
    }
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = (val === 0);
    screenViewport.classList.toggle('muted', video.muted);
  });

  btnLoop.addEventListener('click', (e) => {
    e.stopPropagation();
    video.loop = !video.loop;
    btnLoop.classList.toggle('active-loop', video.loop);
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      screenViewport.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  btnFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  screenViewport.addEventListener('dblclick', (e) => {
    if (!e.target.closest('#videoControls')) {
      toggleFullscreen();
    }
  });

  // ==========================================
  // 5. АВТОПРИХОВУВАННЯ КОНТРОЛЕРІВ
  // ==========================================

  function resetControlsTimeout() {
    videoControls.classList.add('active');
    clearTimeout(controlsTimeout);
    if (!video.paused) {
      controlsTimeout = setTimeout(() => {
        videoControls.classList.remove('active');
      }, 2400);
    }
  }

  screenViewport.addEventListener('mousemove', resetControlsTimeout);
  screenViewport.addEventListener('mouseenter', resetControlsTimeout);

  // ==========================================
  // 6. ГАРЯЧІ КЛАВІШІ
  // ==========================================

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      btnMute.click();
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.code === 'ArrowRight') {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    } else if (e.code === 'ArrowLeft') {
      video.currentTime = Math.max(0, video.currentTime - 5);
    }
  });
});
