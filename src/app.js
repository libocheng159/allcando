import homeright from '../src/components/hoemright.vue';
import typewriter from './components/typewriter.vue';
import tab1 from './components/tabs/tab1.vue';
import tab2 from './components/tabs/tab2.vue';
import tab3 from './components/tabs/tab3.vue';
import loader from './components/loader.vue';
import GoalNotes from './components/GoalNotes.vue';
import config from './config.js';
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

    this.projectcards = this.configdata.projectcards;
    this.socialPlatformIcons = this.configdata.socialPlatformIcons;
    this.personalizedtags = this.configdata.tags;

    // 控制台签名 & Meta 设置
    this.dataConsole();
    if (this.configdata.metaData) {
      this.setMeta(
        this.configdata.metaData.title,
        this.configdata.metaData.description,
        this.configdata.metaData.keywords,
        this.configdata.metaData.icon
      );
    }
    
    let imageurl = "";
    imageurl = this.setMainProperty(imageurl);
    console.log("背景资源地址:", imageurl || this.videosrc);


    const loadImage = () => {
        const imageUrls = [
          this.configdata.avatar,
          ...(this.configdata.projectcards || []).map(item => item.img)
        ].filter(url => url);

        return new Promise((resolve, reject) => {
          const imagePromises = imageUrls.map((url) => {
            return new Promise((resolve) => {
                const imgs = new Image();
                imgs.src = url;
                // 无论成功失败都 resolve，防止页面卡死
                imgs.onload = () => resolve();
                imgs.onerror = () => resolve(); 
            });
          })

          // 设置超时机制：3秒
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => { resolve(); }, 3000);
          });
          
          // 竞速：加载完成 vs 超时
          Promise.race([Promise.all(imagePromises), timeoutPromise]).then(()=>{
            if(imageurl){
              // 图片背景
              const img = new Image();
              img.src = imageurl;
              img.onload = () => { resolve(); };
              img.onerror = () => { resolve(); };
            } else {
              // 视频背景
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
        this.formattedTime =  this.getFormattedTime(new Date());
        this.formattedDate =  this.getFormattedDate(new Date());
        // 延迟关闭 Loading
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
        this.formattedTime =  this.getFormattedTime(new Date()) ;
      }, 1000);

      // 加载音乐
      if (this.configdata.musicPlayer) {
          await this.getMusicInfo();
          if (this.$refs.audioPlayer) {
              this.setupAudioListener();
          }
      }
  },

  beforeDestroy() {
    this.$refs.audioPlayer.removeEventListener('ended',  this.nextTrack);
  },

  watch:{
    isClearScreen(val){
      if(!this.videosrc){
        return
      }
      if(val){
        this.$refs.VdPlayer.style.zIndex = 0; 
        this.$refs.VdPlayer.controls = true;
      }else{
        this.$refs.VdPlayer.style.zIndex = -100; 
        this.$refs.VdPlayer.controls = false;
      }
    },
    audioLoading(val){
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
    setMeta,getFormattedTime,getFormattedDate,dataConsole, 
    // 1. 保存 Token 到本地
    saveGithubToken() {
      const token = prompt("请输入你的 GitHub Access Token (ghp_开头):");
      if (token) {
        localStorage.setItem('gh_token', token);
        alert("Token 已保存！现在你可以直接同步数据到云端了。");
      }
    },

    // 2. 同步数据到 GitHub
    async syncToCloud() {
      const token = localStorage.getItem('gh_token');
      if (!token) {
        alert("请先点击设置里的'钥匙'图标，输入 GitHub Token！");
        return;
      }

      this.isloading = true;

      const USER = 'libocheng159';
      const REPO = 'website-data';
      const PATH = 'config.json';

      const API_URL = `https://api.github.com/repos/${USER}/${REPO}/contents/${PATH}`;

      try {
        // 第一步：获取 SHA (必须)
        const getRes = await fetch(API_URL, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!getRes.ok) throw new Error("连接 GitHub 失败，请检查 Token 或 仓库名");
        const fileData = await getRes.json();
        const sha = fileData.sha;

        // 第二步：准备要上传的数据
        const localGoalsStr = localStorage.getItem('lbc-goals-v2');
        let sourceGoals = this.configdata.goals; // 默认用当前的
        
        if(localGoalsStr) {
            console.log("正在从本地缓存读取最新目标数据...");
            sourceGoals = JSON.parse(localGoalsStr);
        }

        const newConfig = {
            ...this.configdata,
            goals: this.formatGoalsForExport(sourceGoals) 
        };

        // 第三步：编码并上传
        const jsonStr = JSON.stringify(newConfig, null, 2);
        // 使用 TextEncoder 解决中文乱码问题
        const utf8Bytes = new TextEncoder().encode(jsonStr);
        const contentBase64 = btoa(String.fromCharCode(...utf8Bytes));

        const putRes = await fetch(API_URL, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'update: via web client', // 提交信息
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

    formatGoalsForExport(data) {
        
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

    setMainProperty(imageurl){
      const root = document.documentElement;
      if (this.configdata.color) {
        root.style.setProperty('--lbc-welcomtitle-color', this.configdata.color.welcometitlecolor);
        root.style.setProperty('--lbc-vcard-color', this.configdata.color.themecolor);
      }
      if (this.configdata.brightness) {
        root.style.setProperty('--lbc-brightness', `${this.configdata.brightness}%`);
      }
      if (this.configdata.blur) {
        root.style.setProperty('--lbc-blur', `${this.configdata.blur}px`);
      }

      // 2. 设置背景 (直接读取 configdata)
      // 使用 this.xs 来判断设备类型
      if(this.xs){
        if(this.configdata.background.mobile.type == "pic"){
          const mobileUrl = this.configdata.background.mobile.datainfo.url;
          root.style.setProperty('--lbc-background-image-url', `url('${mobileUrl}')`);
          imageurl = mobileUrl;
          return imageurl;
        }else{
          this.videosrc = this.configdata.background.mobile.datainfo.url;
        }
      }else{
        if(this.configdata.background.pc.type == "pic"){
          const pcUrl = this.configdata.background.pc.datainfo.url;
          root.style.setProperty('--lbc-background-image-url', `url('${pcUrl}')`);
          imageurl = pcUrl;
          return imageurl;
        }else{
          this.videosrc = this.configdata.background.pc.datainfo.url;
        }
      }
      return imageurl;
    },

    projectcardsShow(key){
      this.projectcards.forEach((item,index)=>{
        if(index!= key){
          item.show = false;
        }
      })
    },
    handleCancel(){
      this.dialog1 = false;
    },
    jump(url){
      window.open(url, '_blank').focus();
    },
    
    async getMusicInfo(){
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
    updateLyrics(lyrics){
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