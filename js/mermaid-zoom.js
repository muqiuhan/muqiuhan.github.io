// Mermaid 图表点击放大功能

(function() {
    'use strict';

    // 等待 DOM 加载完成
    function initMermaidZoom() {
        const mermaidElements = document.querySelectorAll('.mermaid');
        
        if (mermaidElements.length === 0) return;

        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'mermaid-modal';
        modal.innerHTML = `
            <button class="mermaid-close" aria-label="关闭">&times;</button>
            <div class="mermaid-content"></div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.mermaid-close');
        const content = modal.querySelector('.mermaid-content');

        // 关闭模态框函数
        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        // 为每个 mermaid 图表添加点击事件
        mermaidElements.forEach(function(el) {
            el.addEventListener('click', function(e) {
                // 等待 mermaid 渲染完成
                const svg = el.querySelector('svg');
                if (!svg) return;

                // 复制 SVG 到模态框
                content.innerHTML = '';
                const clonedSvg = svg.cloneNode(true);
                
                // 获取原始 SVG 的尺寸
                const originalWidth = svg.viewBox.baseVal.width || svg.width.baseVal.value || 800;
                const originalHeight = svg.viewBox.baseVal.height || svg.height.baseVal.value || 600;
                
                // 计算放大比例：目标宽度为视口宽度的 80%
                const targetWidth = Math.min(window.innerWidth * 0.85, 1600);
                const scale = targetWidth / originalWidth;
                const newWidth = originalWidth * scale;
                const newHeight = originalHeight * scale;
                
                // 设置放大后的尺寸
                clonedSvg.setAttribute('width', newWidth + 'px');
                clonedSvg.setAttribute('height', newHeight + 'px');
                clonedSvg.style.width = newWidth + 'px';
                clonedSvg.style.height = newHeight + 'px';
                clonedSvg.style.maxWidth = 'none';
                clonedSvg.style.maxHeight = 'none';
                
                // 确保 viewBox 存在
                if (!clonedSvg.getAttribute('viewBox')) {
                    clonedSvg.setAttribute('viewBox', '0 0 ' + originalWidth + ' ' + originalHeight);
                }
                
                content.appendChild(clonedSvg);
                
                // 显示模态框
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        // 关闭按钮事件
        closeBtn.addEventListener('click', closeModal);

        // 点击背景关闭
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // 等待 mermaid 渲染完成后再初始化
    function waitForMermaid() {
        const mermaidElements = document.querySelectorAll('.mermaid');
        let renderedCount = 0;
        
        function checkRendered() {
            let allRendered = true;
            mermaidElements.forEach(function(el) {
                if (!el.querySelector('svg')) {
                    allRendered = false;
                }
            });
            
            if (allRendered) {
                initMermaidZoom();
            } else {
                // 如果还没渲染完，继续等待
                if (renderedCount < 50) { // 最多等待 5 秒
                    renderedCount++;
                    setTimeout(checkRendered, 100);
                } else {
                    // 超时，仍然初始化（可能有些图表渲染失败）
                    initMermaidZoom();
                }
            }
        }
        
        // 开始检查
        setTimeout(checkRendered, 500);
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForMermaid);
    } else {
        waitForMermaid();
    }
})();
