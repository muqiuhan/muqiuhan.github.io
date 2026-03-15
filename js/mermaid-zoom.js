// Mermaid 图表点击放大功能

(function() {
    'use strict';

    // 等待 DOM 加载完成
    function initMermaidZoom() {
        const mermaidElements = document.querySelectorAll('.mermaid');
        
        if (mermaidElements.length === 0) return;

        // 检测是否为移动端
        const isMobile = window.innerWidth <= 688;

        // 移动端：为 mermaid 元素添加提示样式
        if (isMobile) {
            mermaidElements.forEach(function(el) {
                el.style.position = 'relative';
                // 创建提示元素
                const hint = document.createElement('span');
                hint.textContent = '点击放大';
                hint.style.cssText = 'position:absolute;bottom:4px;right:4px;font-size:10px;padding:2px 6px;background:rgba(0,0,0,0.5);color:#fff;border-radius:4px;pointer-events:none;';
                el.appendChild(hint);
            });
        }

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
                
                // 检测是否为移动端
                const isMobile = window.innerWidth <= 688;
                
                // 计算放大比例
                let targetWidth;
                if (isMobile) {
                    // 移动端：适配屏幕宽度，留出边距
                    targetWidth = window.innerWidth - 32; // 16px padding × 2
                } else {
                    // 桌面端：85% 视口宽度，最大 1600px
                    targetWidth = Math.min(window.innerWidth * 0.85, 1600);
                }
                
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
                
                // 移动端样式调整
                if (isMobile) {
                    content.style.maxWidth = '100vw';
                    content.style.maxHeight = '100vh';
                    content.style.padding = '12px';
                    content.style.borderRadius = '0';
                    modal.style.padding = '0';
                } else {
                    // 恢复桌面端样式
                    content.style.maxWidth = '';
                    content.style.maxHeight = '';
                    content.style.padding = '';
                    content.style.borderRadius = '';
                    modal.style.padding = '';
                }
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
