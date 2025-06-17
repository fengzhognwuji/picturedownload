// 修复消息通信问题的 background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');
});

// 处理ping消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse(true);
    return true;
  }
});

// 确保 service worker 保持活跃
chrome.runtime.onStartup.addListener(() => {
  console.log('扩展启动');
});

// 处理截图请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background 收到消息:', request);
  
  if (request.action === 'captureScreen') {
    console.log('开始处理截图');
    
    // 使用异步方式处理截图
    (async () => {
      try {
        const result = await handleScreenCapture();
        console.log('截图成功:', result);
        sendResponse(result);
      } catch (error) {
        console.error('截图失败:', error);
        sendResponse({error: error.message});
      }
    })();
    
    return true; // 保持消息通道开放
  }
  
  // 其他消息处理
  if (request.action === 'ping') {
    sendResponse(true);
    return true;
  }
  
  return false;
});

// 截图处理函数
async function handleScreenCapture() {
  try {
    // 获取当前活动标签页
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (tabs.length === 0) {
      throw new Error('未找到活动标签页');
    }
    
    console.log('找到活动标签页:', tabs[0].id);
    
    // 截图
    const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
      format: 'png',
      quality: 90
    });
    
    if (!dataUrl) {
      throw new Error('截图数据为空');
    }
    
    console.log('截图数据获取成功，长度:', dataUrl.length);
    
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
    
    return {
      success: true,
      downloadId: downloadId,
      filename: filename
    };
    
  } catch (error) {
    console.error('截图处理异常:', error);
    throw error;
  }
}
