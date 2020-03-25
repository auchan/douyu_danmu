/* eslint-disable no-new */
/* eslint-disable no-undef */
/****************************************************************************/
// Global variables
/****************************************************************************/
const fontColorArray = [6, 1, 2, 5, 3, 0, 4]
const PREFER_BARRAGE_NUM = 40
var userBarrageList = []
var barrageStatistics = { count: 0, connectionStatus: '未连接' }
/****************************************************************************/

function dateFtt (fmt, date) {
  var o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds() // 毫秒
  }
  if (/(y+)/.test(fmt)) { fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length)) }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) { fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))) }
  }
  return fmt
}

function createBarrageListVM (barrageList, root) {
  var lastScrollHeight = root.scrollHeight
  var isInsert = false
  return new Vue({
    el: root,
    data: {
      barrages: barrageList
    },
    updated: function () {
      var el = this.$el
      var lastScrollBottom = lastScrollHeight - el.clientHeight
      if (isInsert) {
        el.scrollTop = el.scrollHeight - lastScrollHeight
      } else if (el.scrollTop === lastScrollBottom) {
        el.scrollTop = el.scrollHeight - el.clientHeight
      }
      lastScrollHeight = el.scrollHeight
      isInsert = false
    },
    methods: {
      onScrollBarrageArea: function () {
        var el = this.$el
        if (el.scrollTop > 0) {
          return
        }

        var firstChild = el.firstElementChild
        var startId = firstChild.getAttribute('barrage-id')
        var xmlhttp = new XMLHttpRequest()
        xmlhttp.open('POST', 'load_barrages', true)
        xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
        xmlhttp.onreadystatechange = function () {
          if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
              var gettedBarrageStrs = JSON.parse(xmlhttp.responseText)
              if (gettedBarrageStrs.length === 0) {
                return
              }

              isInsert = true
              for (var i = 0; i < gettedBarrageStrs.length; ++i) {
                var barrage = JSON.parse(gettedBarrageStrs[i])
                barrageList.unshift(barrage)
              }
            }
          }
        }

        xmlhttp.send('start_id=' + startId)
      }
    }
  })
}

function createUserBarrageListVM (barrageList, root) {
  return new Vue({
    el: root,
    data: {
      barrages: barrageList
    },
    methods: {
      onScrollBarrageArea: function () {
        var el = this.$el
        if (el.scrollTop < (el.scrollHeight - el.clientHeight)) {
          return
        }
        var usernameInput = document.getElementById('username')
        var username = usernameInput.value
        if (username === '') {
          return
        }

        var lastChild = el.lastElementChild
        var startId = lastChild.getAttribute('barrage-id')
        var xmlhttp = new XMLHttpRequest()
        xmlhttp.open('POST', 'search_user_barrages', true)
        xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
        xmlhttp.onreadystatechange = function () {
          if (xmlhttp.readyState === 4) {
            if (xmlhttp.status === 200) {
              if (usernameInput.value !== username) {
                // abort
                return
              }

              var barrages = JSON.parse(xmlhttp.responseText)
              for (var i = 0; i < barrages.length; ++i) {
                var barrgae = JSON.parse(barrages[i])
                appendBarrageElement(barrageList, barrgae)
              }
            }
          }
        }

        xmlhttp.send('username=' + username + '&start_id=' + startId)
      }
    }
  })
}

function appendBarrageElement (barrages, barrage) {
  // console.log('[danmu] appendBarrageElement: ', barrage)
  barrages.push(barrage)
}

function isScrollAtBottom (el) {
  return el.scrollTop === (el.scrollHeight - el.clientHeight)
}

function startBarrageWebSocket () {
  if ('WebSocket' in window) {
    console.log('[danmu] WebSocket is supported!')

    // Create WebSocket connection.
    const socket = new WebSocket('wss://' + document.domain + '/ws_danmu')
    // const socket = new WebSocket('ws://' + document.domain + ':8765')

    var barrageList = []
    var barrageArea = document.getElementById('BarrageArea')
    var vm = createBarrageListVM(barrageList, barrageArea)

    // Connection init
    barrageStatistics.connectionStatus = '连接中...'

    // Connection opened
    socket.addEventListener('open', function () {
      // socket.send('Hello Server!');
      console.log('[danmu] Connected.')
      barrageStatistics.connectionStatus = '已连接'
    })

    // Listen for messages
    socket.addEventListener('message', function (event) {
      var newBarrage = JSON.parse(event.data)
      // console.log('[danmu] Message from server ', newBarrage);
      barrageList.push(newBarrage)
      var isAtBottom = isScrollAtBottom(vm.$el)
      if (isAtBottom) {
        if (barrageList.length > PREFER_BARRAGE_NUM) {
          var removeCount = barrageList.length - PREFER_BARRAGE_NUM
          barrageList.splice(0, removeCount)
        }
      }
      barrageStatistics.count = newBarrage.id + 1
    })

    socket.addEventListener('close', function () {
      // socket.send('Hello Server!');
      console.log('[danmu] Disconnected.')
      barrageStatistics.connectionStatus = '连接已断开'
    })
  } else {
    // 浏览器不支持 WebSocket
    console.log('[danmu] WebSocket is not supported!')
  }
}

function searchUserBarrages () {
  // 清空 barrageList
  var barrageList = userBarrageList
  barrageList.splice(0)

  var searchButtonOriginalClassName
  var userBarrageArea = document.getElementById('BarrageArea-User')

  var xmlhttp = new XMLHttpRequest()
  xmlhttp.open('POST', 'search_user_barrages', true)
  xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4) {
      if (xmlhttp.status === 200) {
        var barrages = JSON.parse(xmlhttp.responseText)

        userBarrageArea.style.display = 'block'
        for (var i = 0; i < barrages.length; ++i) {
          var barrage = JSON.parse(barrages[i])
          appendBarrageElement(barrageList, barrage)
        }

        $('#BarrageArea-User').transition('pulse')
      }

      var searchButton = document.getElementById('search_button')
      searchButton.className = searchButtonOriginalClassName
    }
  }

  var errorMsgGroup = document.getElementById('search_error_message_group')
  var usernameInput = document.getElementById('username')
  var username = usernameInput.value
  if (username !== '') {
    errorMsgGroup.style.display = 'none'

    var searchButton = document.getElementById('search_button')
    searchButtonOriginalClassName = searchButton.className
    searchButton.className += ' loading disabled'
    xmlhttp.send('username=' + username)
  } else {
    errorMsgGroup.style.display = 'block'
    var errorMsgLabel = document.getElementById('search_error_message')
    errorMsgLabel.innerHTML = '请输入用户名或者选择下方弹幕列表中的用户名。'
    $('#search_error_message_group').transition('pulse')
  }
}

function fillUserName (username) {
  var usernameInput = document.getElementById('username')
  usernameInput.value = username
}

function registerComponents () {
  Vue.component('barrage-list-item', {
    props: ['barrage'],
    computed: {
      formattedDate: function () {
        var date = new Date(parseInt(this.barrage.cst))
        return dateFtt('yyyy-MM-dd hh:mm:ss', date)
      },
      medalLevelClass: function () {
        return 'FansMedal level-' + this.barrage.bl
      },
      userLevelClass: function () {
        return 'UserLevel UserLevel--' + this.barrage.level
      },
      barrageContentClass: function () {
        var fontColorId = 6
        var bl = this.barrage.bl
        if (bl > 0) {
          if (bl >= 6) {
            var index = Math.floor((bl - 6) / 3) + 1
            index = index > 6 ? 6 : index
            fontColorId = fontColorArray[index]
          }
        }
        return 'Barrage-content Barrage-content--color' + fontColorId
      },
      hasFansMedal: function () {
        return this.barrage.bl > 0
      }
    },
    methods: {
      onClickUserName: function () {
        fillUserName(this.barrage.nickname)
      }
    },
    template: `
      <li class="Barrage-listItem" :barrage-id="barrage.id">
        <span class="Barrage-date Barrage-date--blue">{{formattedDate}}&nbsp;</span>
        <a :class="medalLevelClass" v-if="hasFansMedal">
          <span class="FansMedal-name">{{barrage.bnn}}</span>
        </a>
        <span>&nbsp</span>
        <span :class="userLevelClass" :title="'用户等级：' + barrage.level"></span>
        <span class="Barrage-nickName Barrage-nickName--blue" :title="barrage.nickname" @click="onClickUserName">{{barrage.nickname}}：</span>
        <span :class="barrageContentClass">{{barrage.content}}</span>
      </li>
    `
  })

  Vue.component('barrage-search-button', {
    methods: {
      search_user_barrages: function () {
        searchUserBarrages()
      }
    },
    template: `
      <button class="right attached blue large ui icon button" id="search_button" @click="search_user_barrages">
        <i class="search icon"></i>
      </button>
    `
  })

  Vue.component('barrage-room-id', {
    props: ['roomId'],
    computed: {
      url: function () {
        return 'https://www.douyu.com/' + this.roomId
      }
    },
    template: '<span class="BarrageSpan">房间号：<a :href="url" target="_blank">{{roomId}}</a></span>'
  })

  Vue.component('barrage-connection-status', {
    props: ['barrageStatistics'],
    computed: {
      connectionStatus: function () {
        return this.barrageStatistics.connectionStatus
      }
    },
    template: '<span class="BarrageSpan">弹幕服务器：{{connectionStatus}}</span>'
  })

  Vue.component('barrage-counter', {
    props: ['barrageStatistics'],
    computed: {
      formattedCount: function () {
        var count = this.barrageStatistics.count
        if (count === 0) {
          return '-'
        }
        return count.toString().replace(/(\d{1,3})(?=(\d{3})+$)/g, '$1,')
      }
    },
    template: '<span class="BarrageSpan">弹幕数量：{{formattedCount}}</span>'
  })
}

function initComponents () {
  // barrage-room-id
  new Vue({
    el: 'barrage-room-id'
  })

  // barrage-connection-status
  new Vue({
    el: 'barrage-connection-status',
    data: {
      barrageStatistics: barrageStatistics
    }
  })

  // barrage-counter
  new Vue({
    el: 'barrage-counter',
    data: {
      barrageStatistics: barrageStatistics
    }
  })

  // barrage-search-button
  new Vue({
    el: 'barrage-search-button'
  })

  var userBarrageArea = document.getElementById('BarrageArea-User')
  createUserBarrageListVM(userBarrageList, userBarrageArea)
}

function startApp () {
  registerComponents()
  initComponents()
  startBarrageWebSocket()
}

startApp()
