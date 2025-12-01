import homeright from '../src/components/hoemright.vue';
import typewriter from './components/typewriter.vue';
import tab1 from './components/tabs/tab1.vue';
import tab2 from './components/tabs/tab2.vue';
import tab3 from './components/tabs/tab3.vue';
import loader from './components/loader.vue';
import GoalNotes from './components/GoalNotes.vue';
import config from './config.js';
import { getCookie } from './utils/cookieUtils.js';
import { setMeta, getFormattedTime, getFormattedDate, dataConsole } from './utils/common.js';
import { useDisplay } from 'vuetify'

export default {
  components: {
    tab1, tab2, tab3, loader, homeright, typewriter, GoalNotes
  },
  setup() {
    const { xs, sm, md } = useDisplay();
    return { xs, sm, md };
  },
  data() {
    return {
      isloading: false,
      isClearScreen: false,
      formattedTime: "",
      formattedDate: "",
      configdata: config,
      dialog1: false,
      dialog2: false,
      personalizedtags: null,
      videosrc: '',
      ismusicplayer: false,
      isPlaying: false,
      playlistIndex: 0,
      audioLoading: false,
      musicinfo: null,
      musicinfoLoading: false,
      lyrics: {},
      socialPlatformIcons: null,
      isExpanded: false,
      stackicons: [
        { icon: "mdi-vuejs", color: "green", model: false, tip: 'vue' },
        { icon: "mdi-language-javascript", color: "#CAD300", model: false, tip: 'javascript' },
        { icon: "mdi-language-css3", color: "blue", model: false, tip: 'css' },
        { icon: "mdi-language-html5", color: "red", model: false, tip: 'html' },
        { icon: "$vuetify", color: "#1697F6", model: false, tip: 'vuetify' },
      ],
      projectcards: null,
      tab: null,
      tabs: [
        {
          icon: 'mdi-pencil-plus',
          text: '样式预览',
          value: 'tab-1',
          component: "tab1",
        },
        {
          icon: 'mdi-wallpaper',
          text: '背景预览',
          value: 'tab-2',
          component: "tab2",
        },
        {
          icon: 'mdi-music-circle-outline',
          text: '音乐播放',
          value: 'tab-3',
          component: "tab3",
        },
      ],

    };
  },
  async mounted() {
    // 使用 GitHub Pages 链接并加时间戳防止缓存
    const CLOUD_CONFIG_URL = 'https://libocheng159.github.io/website-data/config.json?v=' + new Date().getTime();

    this.isloading = true;
    try {
      console.log("正在连接云端配置...");
      const response = await fetch(CLOUD_CONFIG_URL);
      if (response.ok) {
        const cloudData = await response.json();
        this.configdata = cloudData;
        console.log("✅ 云端配置加载成功！");
      } else {
        console.warn("❌ 云端加载失败，将使用本地默认配置");
      }
    } catch (error) {
      console.error("❌ 网络请求错误，将使用本地默认配置", error);
    }

    // -----------------------------------------------------------------------
    // 数据同步与页面设置
    // -----------------------------------------------------------------------

    // 重新赋值这些变量，确保它们用的是(可能的)云端新数据
    this.projectcards = this.configdata.projectcards;
    this.socialPlatformIcons = this.configdata.socialPlatformIcons;

    // 控制台签名
    this.dataConsole();

    // 设置 Meta 标签
    if (this.configdata.metaData) {
      this.setMeta(
        this.configdata.metaData.title,
        this.configdata.metaData.description,
        this.configdata.metaData.keywords,
        this.configdata.metaData.icon
      );
    }

    // 设置 CSS 变量 (颜色、背景图/视频)
    let imageurl = "";
    imageurl = this.setMainProperty(imageurl);


    // -----------------------------------------------------------------------
    // 图片预加载
    // -----------------------------------------------------------------------
    const loadImage = () => {
      // 这里的 configdata 已经是云端数据了
      const imageUrls = [
        this.configdata.avatar,
        ...(this.configdata.projectcards || []).map(item => item.img)
      ].filter(url => url);

      return new Promise((resolve, reject) => {
        const imagePromises = imageUrls.map((url) => {
          return new Promise((resolve) => {
            const imgs = new Image();
            imgs.src = url;
            imgs.onload = () => resolve();
            imgs.onerror = () => resolve();
          });
        })

        // 设置超时机制：3秒
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => { resolve(); }, 3000);
        });

        // 赛跑逻辑
        Promise.race([Promise.all(imagePromises), timeoutPromise]).then(() => {
          if (imageurl) {
            const img = new Image();
            img.src = imageurl;
            img.onload = () => { resolve(); };
            img.onerror = () => { resolve(); };
          } else {
            const video = this.$refs.VdPlayer;
            if (video) {
              video.onloadedmetadata = () => { resolve(); };
              video.onerror = () => { resolve(); };
              setTimeout(() => { resolve(); }, 1000);
            } else {
              resolve();
            }
          }
        })
      });
    };

    loadImage().then(() => {
      this.formattedTime = this.getFormattedTime(new Date());
      this.formattedDate = this.getFormattedDate(new Date());
      setTimeout(() => {
        this.isloading = false;
      }, 500);
    }).catch((err) => {
      console.error('资源加载异常:', err);
      setTimeout(() => {
        this.isloading = false;
      }, 100);
    });

    setInterval(() => {
      this.formattedTime = this.getFormattedTime(new Date());
    }, 1000);

    if (this.configdata.musicPlayer) {
      await this.getMusicInfo();
      if (this.$refs.audioPlayer) {
        this.setupAudioListener();
      }
    }
  },

  beforeDestroy() {
    this.$refs.audioPlayer.removeEventListener('ended', this.nextTrack);
  },

  watch: {
    isClearScreen(val) {
      if (!this.videosrc) {
        return
      }
      if (val) {
        this.$refs.VdPlayer.style.zIndex = 0;
        this.$refs.VdPlayer.controls = true;
      } else {
        this.$refs.VdPlayer.style.zIndex = -100;
        this.$refs.VdPlayer.controls = false;
      }
    },
    audioLoading(val) {
      this.isPlaying = !val;
    }
  },

  computed: {
    currentSong() {
      return this.musicinfo[this.playlistIndex];
    },
    audioPlayer() {
      return this.$refs.audioPlayer;
    }
  },

  methods: {
    getCookie, setMeta, getFormattedTime, getFormattedDate, dataConsole,

    // =========================================================
    // 👇👇👇 新增：云端同步相关的三个核心方法 👇👇👇
    // =========================================================

    // 1. 保存 Token
    saveGithubToken() {
      const token = prompt("请输入你的 GitHub Access Token (ghp_开头):");
      if (token) {
        localStorage.setItem('gh_token', token);
        alert("Token 已保存！现在你可以直接同步数据到云端了。");
      }
    },

    // 2. 同步数据到 GitHub (修复了数组/对象转换问题)
    async syncToCloud() {
      const token = localStorage.getItem('gh_token');
      if (!token) {
        alert("请先点击设置里的'钥匙'图标，输入 GitHub Token！");
        return;
      }

      this.isloading = true;

      // ★★★ 你的仓库配置 ★★★
      const USER = 'libocheng159';
      const REPO = 'website-data';
      const PATH = 'config.json';

      const API_URL = `https://api.github.com/repos/${USER}/${REPO}/contents/${PATH}`;

      try {
        // 第一步：获取 SHA
        const getRes = await fetch(API_URL, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!getRes.ok) throw new Error("连接 GitHub 失败，请检查 Token 或 仓库名");
        const fileData = await getRes.json();
        const sha = fileData.sha;

        // 第二步：准备数据
        // 优先读取本地最新的缓存
        const localGoalsStr = localStorage.getItem('leleo-goals-v2');
        let sourceGoals = this.configdata.goals; // 默认用当前的

        if (localGoalsStr) {
          console.log("正在从本地缓存读取最新目标数据...");
          sourceGoals = JSON.parse(localGoalsStr);
        }

        // 构造新配置
        const newConfig = {
          ...this.configdata,
          // 使用 formatGoalsForExport 处理数据，确保格式正确
          goals: this.formatGoalsForExport(sourceGoals)
        };

        // 第三步：上传 (Base64编码 + UTF8修复)
        const jsonStr = JSON.stringify(newConfig, null, 2);
        const utf8Bytes = new TextEncoder().encode(jsonStr);
        const contentBase64 = btoa(String.fromCharCode(...utf8Bytes));

        const putRes = await fetch(API_URL, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'update: via web client',
            content: contentBase64,
            sha: sha,
            branch: 'main'
          })
        });

        if (putRes.ok) {
          alert("✅ 同步成功！GitHub Pages 需要约 30秒~1分钟 生效，请稍候刷新。");
        } else {
          throw new Error("上传失败: " + putRes.statusText);
        }

      } catch (error) {
        console.error(error);
        alert("同步失败：" + error.message);
      } finally {
        this.isloading = false;
      }
    },

    // 3. 数据格式化工具 (处理 Array vs Object 的问题)
    formatGoalsForExport(data) {
      // 情况 A：数据来自 localStorage (是数组 Array) -> 需要拆分
      if (Array.isArray(data)) {
        return {
          shortTerm: data
            .filter(g => g.type === 'short')
            .map(i => ({
              id: i.id,
              title: i.title,
              deadline: i.deadline
            })),
          longTerm: data
            .filter(g => g.type === 'long')
            .map(i => ({
              id: i.id,
              title: i.title,
              content: i.content,
              createDate: i.createDate,
              deadline: i.deadline
            }))
        };
      }

      // 情况 B：数据来自 configdata (已经是对象 Object) -> 清理一下即可
      return {
        shortTerm: (data.shortTerm || []).map(i => ({
          id: i.id, title: i.title, deadline: i.deadline
        })),
        longTerm: (data.longTerm || []).map(i => ({
          id: i.id, title: i.title, content: i.content,
          createDate: i.createDate, deadline: i.deadline
        }))
      };
    },

    // =========================================================
    // 👆👆👆 新增方法结束 👆👆👆
    // =========================================================

    setMainProperty(imageurl) {
      const root = document.documentElement;
      let leleodata = this.getCookie("leleodata");
      if (leleodata) {
        root.style.setProperty('--leleo-welcomtitle-color', `${leleodata.color.welcometitlecolor}`);
        root.style.setProperty('--leleo-vcard-color', `${leleodata.color.themecolor}`);
        root.style.setProperty('--leleo-brightness', `${leleodata.brightness}%`);
        root.style.setProperty('--leleo-blur', `${leleodata.blur}px`);
      } else {
        root.style.setProperty('--leleo-welcomtitle-color', `${this.configdata.color.welcometitlecolor}`);
        root.style.setProperty('--leleo-vcard-color', `${this.configdata.color.themecolor}`);
        root.style.setProperty('--leleo-brightness', `${this.configdata.brightness}%`);
        root.style.setProperty('--leleo-blur', `${this.configdata.blur}px`);
      }

      let leleodatabackground = this.getCookie("leleodatabackground");
      // 使用 this.xs (Vue Options API 中会自动解包 setup 返回的 ref)
      if (leleodatabackground) {
        if (this.xs) {
          if (leleodatabackground.mobile.type == "pic") {
            root.style.setProperty('--leleo-background-image-url', `url('${leleodatabackground.mobile.datainfo.url}')`);
            imageurl = leleodatabackground.mobile.datainfo.url;
            return imageurl;
          } else {
            this.videosrc = leleodatabackground.mobile.datainfo.url;
          }
        } else {
          if (leleodatabackground.pc.type == "pic") {
            root.style.setProperty('--leleo-background-image-url', `url('${leleodatabackground.pc.datainfo.url}')`);
            imageurl = leleodatabackground.pc.datainfo.url;
            return imageurl;
          } else {
            this.videosrc = leleodatabackground.pc.datainfo.url;
          }
        }

      } else {
        if (this.xs) {
          if (this.configdata.background.mobile.type == "pic") {
            root.style.setProperty('--leleo-background-image-url', `url('${this.configdata.background.mobile.datainfo.url}')`);
            imageurl = this.configdata.background.mobile.datainfo.url;
            return imageurl;
          } else {
            this.videosrc = this.configdata.background.mobile.datainfo.url;
          }
        } else {
          if (this.configdata.background.pc.type == "pic") {
            root.style.setProperty('--leleo-background-image-url', `url('${this.configdata.background.pc.datainfo.url}')`);
            imageurl = this.configdata.background.pc.datainfo.url;
            return imageurl;
          } else {
            this.videosrc = this.configdata.background.pc.datainfo.url;
          }

        }
      }
      return imageurl;
    },

    projectcardsShow(key) {
      this.projectcards.forEach((item, index) => {
        if (index != key) {
          item.show = false;
        }
      })
    },
    handleCancel() {
      this.dialog1 = false;
    },
    jump(url) {
      window.open(url, '_blank').focus();
    },

    async getMusicInfo() {
      this.musicinfoLoading = true;
      try {
        const response = await fetch(`https://api.i-meto.com/meting/api?server=${this.configdata.musicPlayer.server}&type=${this.configdata.musicPlayer.type}&id=${this.configdata.musicPlayer.id}`
        );
        if (!response.ok) {
          throw new Error('网络请求失败');
        }
        this.musicinfo = await response.json();
        this.musicinfoLoading = false;
      } catch (error) {
        console.error('请求失败:', error);
      }

    },
    musicplayershow(val) {
      this.ismusicplayer = val;
    },

    setupAudioListener() {
      this.$refs.audioPlayer.addEventListener('ended', this.nextTrack);
    },

    togglePlay() {
      if (!this.isPlaying) {
        this.audioPlayer.play();
        this.isVdMuted = true;
      } else {
        this.audioPlayer.pause();
        this.isVdMuted = false;
      }
      this.isPlaying = !this.musicinfoLoading && !this.isPlaying;
    },
    previousTrack() {
      this.playlistIndex = this.playlistIndex > 0 ? this.playlistIndex - 1 : this.musicinfo.length - 1;
      this.updateAudio();
    },
    nextTrack() {
      this.playlistIndex = this.playlistIndex < this.musicinfo.length - 1 ? this.playlistIndex + 1 : 0;
      this.updateAudio();
    },
    updateAudio() {
      this.audioPlayer.src = this.currentSong.url;
      this.$refs.audiotitle.innerText = this.currentSong.title;
      this.$refs.audioauthor.innerText = this.currentSong.author;
      this.isPlaying = true;
      this.audioPlayer.play();
    },
    updateCurrentIndex(index) {
      this.playlistIndex = index;
      this.updateAudio();
    },
    updateIsPlaying(isPlaying) {
      this.isPlaying = isPlaying;
    },
    updateLyrics(lyrics) {
      this.lyrics = lyrics;
    },
    // 监听等待事件（缓冲不足）
    onWaiting() {
      this.audioLoading = true;
    },
    // 监听可以播放事件（缓冲足够）
    onCanPlay() {
      this.audioLoading = false;
    },
    expandSwitch() {
      this.isExpanded = true;
    },
    collapseSwitch() {
      this.isExpanded = false;
    },
  }
};