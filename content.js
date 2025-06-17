// 获取页面中所有图片 - UTF-8
function getAllImages() {
  const images = Array.from(document.querySelectorAll('img'));
  const uniqueImages = new Map();
  
  images.forEach(img => {
    try {
      // 处理可能的跨域问题
      const src = img.src.startsWith('data:') ? img.src : 
                 new URL(img.src, window.location.href).href;
      
      // 使用src作为key去重
      if (!uniqueImages.has(src)) {
        uniqueImages.set(src, {
          src: src,
          alt: img.alt || '未命名图片',
          width: img.width,
          height: img.height
        });
      }
    } catch (e) {
      console.error('图片处理错误:', e);
    }
  });

  return Array.from(uniqueImages.values());
}


// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request.action);
  
  if (request.action === 'getImages') {
    try {
      const images = getAllImages();
      console.log('返回图片数据:', images.length);
      sendResponse(images);
    } catch (e) {
      console.error('处理消息失败:', e);
      sendResponse({error: e.message});
    }
    return true;
  }
  return false;
});
