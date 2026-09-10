/* FuzzyText — React Bits 组件的纯 JS 移植版
   用法：const stop = FuzzyText(canvas, { text:'404', ... }); */
window.FuzzyText = function (canvas, opts) {
  'use strict';
  if (!canvas) return;
  const o = opts || {};
  const text = String(o.text != null ? o.text : '404');
  const fontSize = o.fontSize || 'clamp(2rem, 10vw, 10rem)';
  const fontWeight = o.fontWeight || 900;
  const fontFamily = o.fontFamily || 'inherit';
  const color = o.color || '#fff';
  const enableHover = o.enableHover !== false;
  const baseIntensity = o.baseIntensity != null ? o.baseIntensity : 0.18;
  const hoverIntensity = o.hoverIntensity != null ? o.hoverIntensity : 0.5;
  const fuzzRange = o.fuzzRange || 30;
  const fps = o.fps || 60;
  const direction = o.direction || 'horizontal';
  const transitionDuration = o.transitionDuration || 0;
  const clickEffect = !!o.clickEffect;
  const glitchMode = !!o.glitchMode;
  const glitchInterval = o.glitchInterval || 2000;
  const glitchDuration = o.glitchDuration || 200;
  const glitchIntensity = o.glitchIntensity != null ? o.glitchIntensity : 1;
  const gradient = o.gradient || null;
  const letterSpacing = o.letterSpacing || 0;
  const rgbOffset = o.rgbOffset || 0;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let isCancelled = false;
  let animationFrameId, glitchTimeoutId, glitchEndTimeoutId, clickTimeoutId;

  const init = async () => {
    const computedFontFamily = fontFamily === 'inherit'
      ? window.getComputedStyle(canvas).fontFamily || 'sans-serif'
      : fontFamily;

    const fontSizeStr = typeof fontSize === 'number' ? fontSize + 'px' : fontSize;
    const fontString = fontWeight + ' ' + fontSizeStr + ' ' + computedFontFamily;

    try { await document.fonts.load(fontString); } catch (e) { await document.fonts.ready; }
    if (isCancelled) return;

    let numericFontSize;
    if (typeof fontSize === 'number') {
      numericFontSize = fontSize;
    } else {
      const temp = document.createElement('span');
      temp.style.fontSize = fontSize;
      document.body.appendChild(temp);
      numericFontSize = parseFloat(window.getComputedStyle(temp).fontSize);
      document.body.removeChild(temp);
    }

    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.font = fontString;
    offCtx.textBaseline = 'alphabetic';

    let totalWidth = 0;
    if (letterSpacing !== 0) {
      for (const ch of text) totalWidth += offCtx.measureText(ch).width + letterSpacing;
      totalWidth -= letterSpacing;
    } else {
      totalWidth = offCtx.measureText(text).width;
    }

    const metrics = offCtx.measureText(text);
    const actualLeft = metrics.actualBoundingBoxLeft || 0;
    const actualRight = letterSpacing !== 0 ? totalWidth : (metrics.actualBoundingBoxRight || metrics.width);
    const actualAscent = metrics.actualBoundingBoxAscent || numericFontSize;
    const actualDescent = metrics.actualBoundingBoxDescent || numericFontSize * 0.2;

    const textBoundingWidth = Math.ceil(letterSpacing !== 0 ? totalWidth : actualLeft + actualRight);
    const tightHeight = Math.ceil(actualAscent + actualDescent);

    const extraWidthBuffer = 10;
    const offscreenWidth = textBoundingWidth + extraWidthBuffer;
    offscreen.width = offscreenWidth;
    offscreen.height = tightHeight;

    const xOffset = extraWidthBuffer / 2;
    offCtx.font = fontString;
    offCtx.textBaseline = 'alphabetic';

    if (gradient && gradient.length >= 2) {
      const grad = offCtx.createLinearGradient(0, 0, offscreenWidth, 0);
      gradient.forEach((c, i) => grad.addColorStop(i / (gradient.length - 1), c));
      offCtx.fillStyle = grad;
    } else {
      offCtx.fillStyle = color;
    }

    if (letterSpacing !== 0) {
      let xPos = xOffset;
      for (const ch of text) {
        offCtx.fillText(ch, xPos, actualAscent);
        xPos += offCtx.measureText(ch).width + letterSpacing;
      }
    } else {
      offCtx.fillText(text, xOffset - actualLeft, actualAscent);
    }

    const horizontalMargin = fuzzRange + 20;
    canvas.width = offscreenWidth + horizontalMargin * 2;
    canvas.height = tightHeight;
    ctx.translate(horizontalMargin, 0);

    const interactiveLeft = horizontalMargin + xOffset;
    const interactiveTop = 0;
    const interactiveRight = interactiveLeft + textBoundingWidth;
    const interactiveBottom = tightHeight;

    let isHovering = false, isClicking = false, isGlitching = false;
    let currentIntensity = baseIntensity, targetIntensity = baseIntensity;
    let lastFrameTime = 0;
    const frameDuration = 1000 / fps;

    // RGB 通道分离图（仅在 rgbOffset>0 时生成）
    let redOff = null, greenOff = null, blueOff = null;
    if (rgbOffset > 0) {
      const tint = (src, color) => {
        const c = document.createElement('canvas');
        c.width = src.width; c.height = src.height;
        const x = c.getContext('2d');
        x.drawImage(src, 0, 0);
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = color;
        x.fillRect(0, 0, c.width, c.height);
        return c;
      };
      redOff = tint(offscreen, '#FF3B30');
      greenOff = tint(offscreen, '#00E676');
      blueOff = tint(offscreen, '#3B82F6');
    }

    const startGlitchLoop = () => {
      if (!glitchMode || isCancelled) return;
      glitchTimeoutId = setTimeout(() => {
        if (isCancelled) return;
        isGlitching = true;
        glitchEndTimeoutId = setTimeout(() => {
          isGlitching = false;
          startGlitchLoop();
        }, glitchDuration);
      }, glitchInterval);
    };
    if (glitchMode) startGlitchLoop();

    const run = (timestamp) => {
      if (isCancelled) return;
      if (timestamp - lastFrameTime < frameDuration) {
        animationFrameId = window.requestAnimationFrame(run);
        return;
      }
      lastFrameTime = timestamp;

      ctx.clearRect(-fuzzRange - 20, -fuzzRange - 10, offscreenWidth + 2 * (fuzzRange + 20), tightHeight + 2 * (fuzzRange + 10));

      if (isClicking) targetIntensity = 1;
      else if (isGlitching) targetIntensity = glitchIntensity;
      else if (isHovering) targetIntensity = hoverIntensity;
      else targetIntensity = baseIntensity;

      if (transitionDuration > 0) {
        const step = 1 / (transitionDuration / frameDuration);
        if (currentIntensity < targetIntensity) currentIntensity = Math.min(currentIntensity + step, targetIntensity);
        else if (currentIntensity > targetIntensity) currentIntensity = Math.max(currentIntensity - step, targetIntensity);
      } else {
        currentIntensity = targetIntensity;
      }

      if (rgbOffset > 0 && (isGlitching || isClicking)) {
        // RGB 通道偏差：红左移、蓝右移、绿居中，爆闪/点击时才出现
        const o = rgbOffset * (isClicking ? 1 : glitchIntensity);
        const jx = (Math.random() - 0.5) * 5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(redOff, -o, jx);
        ctx.drawImage(blueOff, o, -jx);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(greenOff, 0, 0);
      } else if (direction === 'horizontal') {
        for (let j = 0; j < tightHeight; j++) {
          const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
        }
      } else if (direction === 'vertical') {
        for (let i = 0; i < offscreenWidth; i++) {
          const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, i, 0, 1, tightHeight, i, dy, 1, tightHeight);
        }
      } else {
        for (let j = 0; j < tightHeight; j++) {
          const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange);
          ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
        }
        const tempData = ctx.getImageData(0, 0, offscreenWidth + fuzzRange, tightHeight + fuzzRange);
        ctx.clearRect(-fuzzRange - 20, -fuzzRange - 10, offscreenWidth + 2 * (fuzzRange + 20), tightHeight + 2 * (fuzzRange + 10));
        ctx.putImageData(tempData, 0, 0);
        for (let i = 0; i < offscreenWidth + fuzzRange; i++) {
          const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * fuzzRange * 0.5);
          const colData = ctx.getImageData(i, 0, 1, tightHeight + fuzzRange);
          ctx.clearRect(i, -fuzzRange, 1, tightHeight + 2 * fuzzRange);
          ctx.putImageData(colData, i, dy);
        }
      }
      animationFrameId = window.requestAnimationFrame(run);
    };
    animationFrameId = window.requestAnimationFrame(run);

    const isInsideTextArea = (x, y) =>
      x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom;

    const handleMouseMove = (e) => {
      if (!enableHover) return;
      const rect = canvas.getBoundingClientRect();
      isHovering = isInsideTextArea(e.clientX - rect.left, e.clientY - rect.top);
    };
    const handleMouseLeave = () => { isHovering = false; };
    const handleClick = () => {
      if (!clickEffect) return;
      isClicking = true;
      clearTimeout(clickTimeoutId);
      clickTimeoutId = setTimeout(() => { isClicking = false; }, 150);
    };
    const handleTouchMove = (e) => {
      if (!enableHover) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      isHovering = isInsideTextArea(t.clientX - rect.left, t.clientY - rect.top);
    };
    const handleTouchEnd = () => { isHovering = false; };

    if (enableHover) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
    }
    if (clickEffect) canvas.addEventListener('click', handleClick);

    canvas.cleanupFuzzyText = function () {
      window.cancelAnimationFrame(animationFrameId);
      clearTimeout(glitchTimeoutId);
      clearTimeout(glitchEndTimeoutId);
      clearTimeout(clickTimeoutId);
      if (enableHover) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
      if (clickEffect) canvas.removeEventListener('click', handleClick);
    };
  };

  init();
  return function stop() {
    isCancelled = true;
    window.cancelAnimationFrame(animationFrameId);
    clearTimeout(glitchTimeoutId);
    clearTimeout(glitchEndTimeoutId);
    clearTimeout(clickTimeoutId);
    if (canvas && canvas.cleanupFuzzyText) canvas.cleanupFuzzyText();
  };
};
