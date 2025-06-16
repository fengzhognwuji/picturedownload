// UTF-8 编码
document.addEventListener('DOMContentLoaded', () => {
  const imageList = document.getElementById('image-list');
  const downloadBtn = document.getElementById('download-btn');
  const loading = document.getElementById('loading');
  
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
          <img class="image-preview" src="${img.src}" alt="${img.alt}">
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
  
  // 方案2: 使用 Chrome Downloads API 设置下载路径
document.getElementById('change-path').addEventListener('click', () => {
  // 打开 Chrome 下载设置页面
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

    checkboxes.forEach(checkbox => {
      try {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const ext = checkbox.dataset.src.split('.').pop().split('?')[0];
        // 确保路径格式正确
        const sanitizedPath = downloadPath.replace(/\\/g, '/').replace(/\/$/, '');
        const sanitizedExt = ext && ext.length <= 10 ? ext : 'jpg'; // 限制扩展名长度
        const filename = `${sanitizedPath}/image_${dateStr}_${randomNum}.${sanitizedExt}`;
        const options = {
          url: checkbox.dataset.src,
          filename: filename,
          conflictAction: 'uniquify',
          saveAs: false
        };
        
        chrome.downloads.download(options, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('下载失败:', chrome.runtime.lastError);
            alert(`下载失败: ${chrome.runtime.lastError.message}`);
          }
        });
      } catch (e) {
        console.error('下载处理错误:', e);
      }
    });
  });
});
