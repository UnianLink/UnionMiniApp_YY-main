Component({
  data: {
    selected: 2, // 默认选中主页
    list: [
      {
        pagePath: "pages/connect/connect",
        text: "朋友"
      },
      {
        pagePath: "pages/device/device",
        text: "设备"
      },
      {
        pagePath: "pages/index/index",
        text: "主页"
      }
    ]
  },

  methods: {
    updateSelected(pagePath) {
      const index = this.data.list.findIndex(item => ('/' + item.pagePath) === pagePath);
      if (index !== -1 && this.data.selected !== index) {
        this.setData({ selected: index });
      }
    },
    switchTab(e) {
      console.log('[TabBar] switchTab被调用', e);
      
      const data = e.currentTarget.dataset;
      const index = data.index;
      
      console.log('[TabBar] 点击的index:', index);
      
      if (index === undefined || index === null) {
        console.error('[TabBar] 没有找到index');
        return;
      }
      
      const targetPage = this.data.list[index];
      if (!targetPage) {
        console.error('[TabBar] 没有找到目标页面');
        return;
      }
      
      const url = '/' + targetPage.pagePath;
      console.log('[TabBar] 准备跳转到:', url);
      
      // 简单的页面跳转
      wx.switchTab({ 
        url: url,
        success: () => {
          console.log('[TabBar] 跳转成功');
          this.setData({ selected: index });
        },
        fail: (err) => {
          console.error('[TabBar] 跳转失败:', err);
        }
      });
    }
  }
}); 