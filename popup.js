// UTF-8 编码
document.addEventListener('DOMContentLoaded', () => {
  const imageList = document.getElementById('image-list');
  const downloadBtn = document.getElementById('download-btn');
  const loading = document.getElementById('loading');
  const captureBtn = document.getElementById('capture-screen');
  const screenshotBtn = document.getElementById('screenshot-btn');
  
  // 检查 background script 是否可用
  function checkBackgroundScript() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({action: 'ping'}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Background script 不可用:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  // 截图功能
  async function captureScreen() {
    console.log('开始截图流程');
    
    const originalText = captureBtn.textContent;
    const originalBgColor = captureBtn.style.backgroundColor;
    
    // 更新按钮状态
    captureBtn.textContent = '截图中...';
    captureBtn.disabled = true;
    captureBtn.style.backgroundColor = '#ff9800';
    
    if (screenshotBtn) {
      screenshotBtn.textContent = '截图中...';
      screenshotBtn.disabled = true;
    }
    
    try {
      // 检查 background script
      const isBackgroundAvailable = await checkBackgroundScript();
      if (!isBackgroundAvailable) {
        throw new Error('扩展后台服务不可用，请刷新扩展');
      }
      
      // 直接在 popup 中处理截图
      await captureScreenDirectly();
      
      // 成功状态
      captureBtn.textContent = '截图成功!';
      captureBtn.style.backgroundColor = '#4caf50';
      if (screenshotBtn) {
        screenshotBtn.textContent = '成功!';
      }
      
    } catch (error) {
      console.error('截图失败:', error);
      captureBtn.textContent = '截图失败';
      captureBtn.style.backgroundColor = '#f44336';
      if (screenshotBtn) {
        screenshotBtn.textContent = '失败';
      }
      alert('截图失败: ' + error.message);
    }
    
    // 恢复按钮状态
    setTimeout(() => {
      captureBtn.textContent = originalText;
      captureBtn.style.backgroundColor = originalBgColor;
      captureBtn.disabled = false;
      if (screenshotBtn) {
        screenshotBtn.textContent = '截图';
        screenshotBtn.disabled = false;
      }
    }, 2000);
  }
  
  // 直接在 popup 中处理截图
  async function captureScreenDirectly() {
    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (tabs.length === 0) {
        throw new Error('未找到活动标签页');
      }
      
      console.log('找到活动标签页:', tabs[0].id, '窗口ID:', tabs[0].windowId);
      
      // 截图
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });
      
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 1000) {
        console.error('无效的截图数据:', dataUrl);
        throw new Error('截图数据无效');
      }
      
      console.log('截图成功，数据长度:', dataUrl.length);
      
      // 生成文件名
      const now = new Date();
      const timestamp = now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + 
        String(now.getMinutes()).padStart(2, '0') + 
        String(now.getSeconds()).padStart(2, '0');
      
      const filename = `screenshot_${timestamp}.png`;
      
      // 下载文件
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        conflictAction: 'uniquify',
        saveAs: false
      });
      
      console.log('文件下载成功，ID:', downloadId);
      
    } catch (error) {
      console.error('直接截图失败:', error);
      throw error;
    }
  }
  
  // 绑定截图按钮事件
  if (captureBtn) {
    captureBtn.addEventListener('click', captureScreen);
  }
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', captureScreen);
  }
  
  
  // 获取当前标签页并发送消息获取图片
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs.length === 0) {
      loading.style.display = 'none';
      imageList.innerHTML = '<p>未找到活动标签页</p>';
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {action: 'getImages'}, response => {
      loading.style.display = 'none';
      
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        imageList.innerHTML = '<p>无法获取图片: ' + chrome.runtime.lastError.message + '</p>';
        return;
      }
      
      if (!response || response.error || response.length === 0) {
        imageList.innerHTML = '<p>未找到图片</p>';
        return;
      }

      // 渲染图片列表
      response.forEach(img => {
        const item = document.createElement('div');
        item.className = 'image-item';
        item.innerHTML = `
          <input type="checkbox" data-src="${img.src}">
          <img class="image-preview" src="${img.src}" alt="${img.alt}" onerror="this.style.display='none'">
          <span>${img.alt} (${img.width}x${img.height})</span>
        `;
        imageList.appendChild(item);
      });
    });
  });

  // 全选/取消全选
  const selectAllBtn = document.getElementById('select-all');
  let allSelected = false;
  
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = !allSelected;
    });
    allSelected = !allSelected;
    selectAllBtn.textContent = allSelected ? '取消全选' : '全选';
  });

  // 存储下载路径
  let downloadPath = '图片下载';
  
  // 修改下载路径
  document.getElementById('change-path').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'chrome://settings/downloads'
    });
  });

  // 下载选中图片
  downloadBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
      alert('请先选择要下载的图片');
      return;
    }

    let downloadCount = 0;
    const totalCount = checkboxes.length;
    
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = `下载中... (0/${totalCount})`;
    downloadBtn.disabled = true;

    checkboxes.forEach((checkbox, index) => {
      try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const ext = checkbox.dataset.src.split('.').pop().split('?')[0];
        const sanitizedPath = downloadPath.replace(/\\/g, '/').replace(/\/$/, '');
        const sanitizedExt = ext && ext.length <= 10 ? ext : 'jpg';
        const filename = `${sanitizedPath}/image_${dateStr}_${randomNum}.${sanitizedExt}`;
        
        chrome.downloads.download({
          url: checkbox.dataset.src,
          filename: filename,
          conflictAction: 'uniquify',
          saveAs: false
        }, (downloadId) => {
          downloadCount++;
          downloadBtn.textContent = `下载中... (${downloadCount}/${totalCount})`;
          
          if (chrome.runtime.lastError) {
            console.error('下载失败:', chrome.runtime.lastError);
          }
          
          if (downloadCount === totalCount) {
            setTimeout(() => {
              downloadBtn.textContent = originalText;
              downloadBtn.disabled = false;
            }, 1000);
          }
        });
      } catch (e) {
        console.error('下载处理错误:', e);
        downloadCount++;
        if (downloadCount === totalCount) {
          downloadBtn.textContent = originalText;
          downloadBtn.disabled = false;
        }
      }
    });
  });
});
