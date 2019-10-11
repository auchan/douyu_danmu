function dateFtt(fmt,date)   
{ //author: meizz   
	var o = {   
		"M+" : date.getMonth()+1,                 //月份   
		"d+" : date.getDate(),                    //日   
		"h+" : date.getHours(),                   //小时   
		"m+" : date.getMinutes(),                 //分   
		"s+" : date.getSeconds(),                 //秒   
		"q+" : Math.floor((date.getMonth()+3)/3), //季度   
		"S"  : date.getMilliseconds()             //毫秒   
	};   
	if(/(y+)/.test(fmt))   
		fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));   
	for(var k in o)   
		if(new RegExp("("+ k +")").test(fmt))   
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));   
		return fmt;   
} 

var fontColorArray = new Array(6, 1, 2, 5, 3, 0, 4)

function createBarrageElement(obj)
{
	var li = document.createElement("li")
	li.className = "Barrage-listItem"
	li.setAttribute("Barrage-id", obj.id)

	// time
	var date = new Date(parseInt(obj.cst));
	var span = document.createElement("span")
	span.className = "Barrage-nickName Barrage-nickName--blue"
	span.innerHTML = dateFtt("yyyy-MM-dd hh:mm:ss", date) + "&nbsp;"
	li.appendChild(span)

	var fontColorId = 6
	if (obj.bl > 0)
	{
		if (obj.bl >= 6)
		{
			var index = Math.floor((obj.bl - 6) / 3) + 1
			index = index > 6 ? 6 : index;
			fontColorId = fontColorArray[index]  
		}
		
		var a = document.createElement("a")
		a.className = "FansMedal level-" + obj.bl
		var span = document.createElement("span")
		span.className = "FansMedal-name"
		span.innerHTML = obj.bnn
		a.appendChild(span)
		li.appendChild(a)
	}
	var span = document.createElement("span")
	span.innerHTML = "&nbsp;"
	li.appendChild(span)


	var span = document.createElement("span")
	span.className = "UserLevel UserLevel--" + obj.level
	span.setAttribute("title", "用户等级：" + obj.level)
	li.appendChild(span)

	var span = document.createElement("span")
	span.className = "Barrage-nickName Barrage-nickName--blue"
	span.setAttribute("title", obj.nickname)
	span.setAttribute("onclick", "fillUserName(this)")
	span.innerHTML = obj.nickname + "："
	li.appendChild(span)

	var span = document.createElement("span")
	span.className = "Barrage-content Barrage-content--color"+fontColorId
	span.innerHTML = obj.content
	li.appendChild(span)

	return li
}

function appendBarrageElement(obj, root, isTopDown)
{
	var bottomScrollTop = root.scrollHeight - root.clientHeight
	var li = createBarrageElement(obj)
	root.appendChild(li)
	if (!isTopDown)
	{
		if (root.scrollTop == bottomScrollTop)
		{
			root.scrollTop = (root.scrollHeight - root.clientHeight);
		}
	}
}

function insertBarrageElement(obj, root)
{
	var li = createBarrageElement(obj)
	root.insertBefore(li, root.firstChild)
}

function clearElements(root)
{
	var childs = root.childNodes; 
	for(var i = childs.length - 1; i >= 0; i--) 
	{
		root.removeChild(childs[i]);
	}

}

var barrageCountElem = document.getElementById("BarrageCount")
function setBarrageCount(count) 
{
	barrageCountElem.innerHTML = count.toString().replace(/(\d{1,3})(?=(\d{3})+$)/g,'$1,');
}


function startBarrageWebSocket()
{
	if ("WebSocket" in window)
	{
		console.log("您的浏览器支持 WebSocket!");
		
	// Create WebSocket connection.
	const socket = new WebSocket('ws://' + document.domain + ':8765');

	var barrageArea = document.getElementById("BarrageArea");
	var barrageConnectionStatus = document.getElementById("BarrageConnectionStatus");
	var lastLi;
	barrageConnectionStatus.innerHTML = "连接中..."

	// Connection opened
	socket.addEventListener('open', function (event) {
			// socket.send('Hello Server!');
			console.log("connected")
			barrageConnectionStatus.innerHTML = "已连接"
		});

	// Listen for messages
	socket.addEventListener('message', function (event) {
		var obj = JSON.parse(event.data);
		// console.log('Message from server ', obj);
		appendBarrageElement(obj, barrageArea, false)
		setBarrageCount(obj.id + 1);
	});

	socket.addEventListener('close', function (event) {
			// socket.send('Hello Server!');
			console.log("disconnected")
			barrageConnectionStatus.innerHTML = "连接已断开"
		});
	}
	else
	{
		 // 浏览器不支持 WebSocket
		 console.log("您的浏览器不支持 WebSocket!")
	}
}


function search_user_barrages()
{
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("POST", "search_user_barrages", true)
	xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
	xmlhttp.onreadystatechange = function()
	{
		if (xmlhttp.readyState == 4)
		{
			if (xmlhttp.status == 200)
			{
				var barrgaes = JSON.parse(xmlhttp.responseText)
				var userBarrageArea = document.getElementById("BarrageArea-User");
				userBarrageArea.style.display = "block"
				clearElements(userBarrageArea)
				for (var i = 0; i < barrgaes.length; ++i) 
				{
					var barrgae = JSON.parse(barrgaes[i])
					appendBarrageElement(barrgae, userBarrageArea, true)
				}
			}

			var search_prompt = document.getElementById("search_prompt");
			search_prompt.style.display = "none";
			var search_button = document.getElementById("search_button");
			search_button.style.display = "inline";
		}
	}

	var usernameInput = document.getElementById("username");
	var username = usernameInput.value
	if (username != "")
	{
		var search_prompt = document.getElementById("search_prompt");
		search_prompt.style.display = "inline";
		var search_button = document.getElementById("search_button");
		search_button.style.display = "none";
		xmlhttp.send("username="+username)
	}
}

function fillUserName(obj)
{
	var usernameInput = document.getElementById("username");
	username.value = obj.title
}

function onScrollBarrageArea(obj)
{
	if (obj.scrollTop == 0)
	{
		var firstChild = obj.firstElementChild
		var start_id = firstChild.getAttribute("Barrage-id")
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("POST", "load_barrages", true)
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
		xmlhttp.onreadystatechange = function()
		{
			if (xmlhttp.readyState == 4)
			{
				if (xmlhttp.status == 200)
				{
					var barrgaes = JSON.parse(xmlhttp.responseText)
					var barrageArea = document.getElementById("BarrageArea");
					var lastScrollHeight = obj.scrollHeight
					for (var i = 0; i < barrgaes.length; ++i) 
					{
						var barrgae = JSON.parse(barrgaes[i])
						insertBarrageElement(barrgae, barrageArea)
					}
					obj.scrollTop = obj.scrollHeight - lastScrollHeight
				}
			}
		}

		xmlhttp.send("start_id="+start_id)
	}
	
}

function onScrollUserBarrageArea(obj)
{
	if (obj.scrollTop == (obj.scrollHeight - obj.clientHeight))
	{
		var usernameInput = document.getElementById("username");
		var username = usernameInput.value
		if (username == "")
		{
			return
		}

		var lastChild = obj.lastElementChild
		var start_id = lastChild.getAttribute("Barrage-id")
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("POST", "search_user_barrages", true)
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
		xmlhttp.onreadystatechange = function()
		{
			if (xmlhttp.readyState == 4)
			{
				if (xmlhttp.status == 200)
				{
					if (usernameInput.value != username)
					{
						// abort
						return
					}

					var barrgaes = JSON.parse(xmlhttp.responseText)
					var barrageArea = document.getElementById("BarrageArea-User");
					var lastScrollHeight = obj.scrollHeight
					for (var i = 0; i < barrgaes.length; ++i) 
					{
						var barrgae = JSON.parse(barrgaes[i])
						appendBarrageElement(barrgae, barrageArea, true)
					}
					// obj.scrollTop = obj.scrollHeight - lastScrollHeight
				}
			}
		}

		xmlhttp.send("username="+username+"&start_id="+start_id)
	}
}

startBarrageWebSocket()