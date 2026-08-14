'use strict';

/* texture from https://opengameart.org/content/isometric-landscape */

const $ = _ => document.querySelector(_)

const $c = _ => document.createElement(_)

const ntiles = 7
const tileWidth = 128
const tileHeight = 64
const texWidth = 12
const texHeight = 6
const w = 910
const h = 462

let canvas, bg, cf, fgCanvas, map, tools, tool, activeTool, isPlacing

const texture = new Image()
texture.src = "textures/01_130x66_130x230.png"
texture.onload = _ => init()

const init = () => {

  tool = readTool()

  map = []
  for (let i = 0; i < ntiles; i++) {
    const row = []
    for (let j = 0; j < ntiles; j++) {
      row.push([0, 0])
    }
    map.push(row)
  }

  canvas = $("#bg")
  canvas.width = 910
  canvas.height = 666
  bg = canvas.getContext("2d")
  bg.translate(w / 2, tileHeight * 2)

  loadHashState(readMap())

  drawMap()

  fgCanvas = $('#fg')
  fgCanvas.width = canvas.width
  fgCanvas.height = canvas.height
  cf = fgCanvas.getContext('2d')
  cf.translate(w / 2, tileHeight * 2)

  /* One pointer stream covers mouse, pen and touch, so a press places one
     tile whichever device it came from. */
  fgCanvas.addEventListener('pointerdown', pointerDown)
  fgCanvas.addEventListener('pointermove', pointerMove)
  fgCanvas.addEventListener('pointerup', pointerUp)
  fgCanvas.addEventListener('pointercancel', pointerUp)
  fgCanvas.addEventListener('contextmenu', e => e.preventDefault())

  const clearButton = $('#CLEAR')
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      for (let i = 0; i < ntiles; i++)
        for (let j = 0; j < ntiles; j++)
          map[i][j] = [0, 0]
      drawMap()
      cf.clearRect(-w, -h, w * 2, h * 2)
      updateHashState()
    })
  }

  tools = $('#tools')

  let toolCount = 0
  for (let i = 0; i < texHeight; i++) {
    for (let j = 0; j < texWidth; j++) {
      const div = $c('div');
      const index = toolCount++
      div.id = `tool_${index}`
      div.style.display = "block"
      /* width of 132 instead of 130  = 130 image + 2 border = 132 */
      div.style.backgroundPosition = `-${j*130+2}px -${i*230}px`
      div.addEventListener('click', () => {
        tool = [i, j]
        if (activeTool)
          $(`#${activeTool}`).classList.remove('selected')
        activeTool = div.id
        div.classList.add('selected')
        updateHashState()
      })

      /* The tile held when the layout was saved is held again on opening it. */
      if (index === tool[0] * texWidth + tool[1]) {
        activeTool = div.id
        div.classList.add('selected')
      }

      tools.appendChild(div)
    }
  }

}

// From https://stackoverflow.com/a/36046727
const ToBase64 = u8 => {
  return btoa(String.fromCharCode.apply(null, u8))
}

const FromBase64 = str => {
  return atob(str).split('').map(c => c.charCodeAt(0))
}

/*
 * The grid and the held tile are written as named parameters, which is what
 * the rest of the system expects of a page address: the shell passes the theme
 * in beside them, saving keeps whatever is there, and opening a document puts
 * it back.
 */
const updateHashState = () => {
  let c = 0
  const u8 = new Uint8Array(ntiles * ntiles)
  for (let i = 0; i < ntiles; i++) {
    for (let j = 0; j < ntiles; j++) {
      u8[c++] = map[i][j][0] * texWidth + map[i][j][1]
    }
  }

  WOSState.write({ map: ToBase64(u8), tool: tool[0] * texWidth + tool[1] })
}

const SYSTEM_KEYS = /^(theme|docs|map|tool)=/

/*
 * A fragment carrying no key at all is read as the grid on its own, so a bare
 * image in the address still opens.
 */
const readMap = () => {
  const values = WOSState.read()

  if (typeof values.map === 'string' && values.map !== '')
    return values.map

  return document.location.hash.substring(1)
    .split('&')
    .filter(part => part !== '' && SYSTEM_KEYS.test(part) === false)
    .join('')
}

const readTool = () => {
  const held = WOSState.integer(WOSState.read(), 'tool', 0)

  if (held < 0 || held >= texWidth * texHeight)
    return [0, 0]

  return [Math.trunc(held / texWidth), held % texWidth]
}

const loadHashState = state => {
  if (state === '')
    return

  let u8 = []
  try {
    u8 = FromBase64(state)
  } catch (error) {
    return
  }

  let c = 0
  for (let i = 0; i < ntiles; i++) {
    for (let j = 0; j < ntiles; j++) {
      const t = u8[c++] || 0
      const x = Math.trunc(t / texWidth)
      const y = Math.trunc(t % texWidth)
      map[i][j] = x < texHeight ? [x, y] : [0, 0]
    }
  }
}

const place = (pos, erase) => {
  map[pos.x][pos.y][0] = erase ? 0 : tool[0]
  map[pos.x][pos.y][1] = erase ? 0 : tool[1]

  drawMap()
  cf.clearRect(-w, -h, w * 2, h * 2)
  updateHashState()
}

const pointerDown = e => {
  const pos = getPosition(e)
  if (!withinMap(pos))
    return

  isPlacing = true
  fgCanvas.setPointerCapture(e.pointerId)
  place(pos, e.button === 2)
}

const pointerMove = e => {
  const pos = getPosition(e)

  if (!withinMap(pos)) {
    cf.clearRect(-w, -h, w * 2, h * 2)
    return
  }

  if (isPlacing) {
    place(pos, e.buttons === 2)
    return
  }

  cf.clearRect(-w, -h, w * 2, h * 2)
  drawTile(cf, pos.x, pos.y, 'rgba(0,0,0,0.2)')
}

const pointerUp = () => {
  isPlacing = false
}

const withinMap = pos =>
  pos.x >= 0 && pos.x < ntiles && pos.y >= 0 && pos.y < ntiles

const drawMap = () => {
  bg.clearRect(-w, -h, w * 2, h * 2)
  for (let i = 0; i < ntiles; i++) {
    for (let j = 0; j < ntiles; j++) {
      drawImageTile(bg, i, j, map[i][j][0], map[i][j][1])
    }
  }
}

const drawTile = (c, x, y, color) => {
  c.save()
  c.translate((y - x) * tileWidth / 2, (x + y) * tileHeight / 2)
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(tileWidth / 2, tileHeight / 2)
  c.lineTo(0, tileHeight)
  c.lineTo(-tileWidth / 2, tileHeight / 2)
  c.closePath()
  c.fillStyle = color
  c.fill()
  c.restore()
}

const drawImageTile = (c, x, y, i, j) => {
  c.save()
  c.translate((y - x) * tileWidth / 2, (x + y) * tileHeight / 2)
  j *= 130
  i *= 230
  c.drawImage(texture, j, i, 130, 230, -65, -130, 130, 230)
  c.restore()
}

const getPosition = e => {
  const _y = (e.offsetY - tileHeight * 2) / tileHeight,
    _x = e.offsetX / tileWidth - ntiles / 2
  return {
    x: Math.floor(_y - _x),
    y: Math.floor(_x + _y)
  }
}
