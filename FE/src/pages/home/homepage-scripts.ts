/* Port 2 IIFE của SHUB Homepage.html thành initHomepage(root) + cleanup.
   Khác bản gốc (ghi ở docs/HOMEPAGE.md):
   - Bỏ phần theme toggle (dùng useTheme() ở JSX) và phần vẽ thẻ chuyên gia của IIFE #1
     (IIFE #2 ghi đè #ex + #fl.onclick ngay khi load — kết quả DOM giống hệt).
   - Query scoped theo root; modal append vào root thay document.body.
   - Title/scroll/overflow trên document được save/restore khi unmount. */
export function initHomepage(root: HTMLElement): () => void {
  const d = document
  const r = d.documentElement

  const prevTitle = d.title
  const prevScrollBehavior = r.style.scrollBehavior
  const prevScrollPaddingTop = r.style.scrollPaddingTop
  const prevBodyOverflowX = d.body.style.overflowX
  const prevHtmlOverflow = r.style.overflow
  d.title = 'Shared Hub (SHUB) - AI Workspace & Sàn Chuyên gia Thuế TNDN'
  const rdc = matchMedia('(prefers-reduced-motion:reduce)').matches
  r.style.scrollPaddingTop = 'calc(env(safe-area-inset-top,0px) + 84px)'
  if (!rdc) r.style.scrollBehavior = 'smooth'
  d.body.style.overflowX = 'hidden'

  let tId: ReturnType<typeof setTimeout> | undefined
  let plUL: (() => void) | undefined
  let onScroll: (() => void) | undefined

  /* ===== IIFE #1 (phần hiệu lực) ===== */
  const mn = d.getElementById('mn')
  const nv = d.getElementById('nv')
  if (mn && nv) {
    mn.onclick = function () {
      nv.classList.toggle('open')
    }
    root.querySelectorAll<HTMLAnchorElement>('.links a').forEach(function (a) {
      a.onclick = function () {
        nv.classList.remove('open')
      }
    })
  }

  const q = d.getElementById('q') as HTMLInputElement | null
  const P = [
    'Chi phí phúc lợi cho nhân viên có được trừ khi tính thuế TNDN không?',
    'Khoản chi lãi vay được trừ trong giới hạn nào?',
    'Chiết khấu thương mại hạch toán thế nào khi quyết toán TNDN?',
  ]

  const h1 = root.querySelector<HTMLElement>('.hero h1')
  let wi = 0
  if (h1 && q && !rdc && !h1.querySelector('.hw')) {
    const sp = function (nd: Node) {
      Array.prototype.slice.call(nd.childNodes).forEach(function (c) {
        const node = c as ChildNode
        if (node.nodeType === 3) {
          const f = d.createDocumentFragment()
          ;(node.nodeValue ?? '')
            .split(/(\s+)/)
            .forEach(function (p) {
              if (!p) return
              if (/^\s+$/.test(p)) {
                f.appendChild(d.createTextNode(p))
                return
              }
              const m = d.createElement('span')
              m.className = 'hw'
              const w = d.createElement('span')
              w.textContent = p
              w.style.animationDelay = (0.16 + wi++ * 0.055).toFixed(3) + 's'
              m.appendChild(w)
              f.appendChild(m)
            })
          node.parentNode?.replaceChild(f, node)
        } else if (node.nodeType === 1) {
          const el = node as HTMLElement
          if (el.classList.contains('hl')) {
            const m2 = d.createElement('span')
            m2.className = 'hw'
            el.parentNode?.replaceChild(m2, el)
            m2.appendChild(el)
            el.style.animationDelay = (0.16 + wi++ * 0.055).toFixed(3) + 's'
          } else sp(node)
        }
      })
    }
    sp(h1)
  }

  const hul = root.querySelector<SVGSVGElement>('.hul')
  const hlq = h1 ? h1.querySelector<HTMLElement>('.hl') : null
  if (hul && hlq && h1) {
    plUL = function () {
      const rng = d.createRange()
      let L = 1e9
      let R = -1e9
      let B = -1e9
      rng.selectNodeContents(hlq)
      const rs = rng.getClientRects()
      for (let i = 0; i < rs.length; i++) {
        const r2 = rs[i]
        if (r2.width < 1) continue
        L = Math.min(L, r2.left)
        R = Math.max(R, r2.right)
        B = Math.max(B, r2.bottom)
      }
      if (R < L) return
      const hr = h1.getBoundingClientRect()
      const fs = parseFloat(getComputedStyle(h1).fontSize) || 16
      hul.style.left = (L - hr.left).toFixed(1) + 'px'
      hul.style.top = (B - hr.top - fs * 0.08).toFixed(1) + 'px'
      hul.style.width = (R - L).toFixed(1) + 'px'
      hul.classList.add('on')
    }
    plUL()
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(plUL)
    window.addEventListener('resize', plUL)
  }

  if (q && !rdc) {
    let ph = 0
    let pl = P[0].length
    let pm: 'hold' | 'del' | 'typ' = 'hold'
    q.placeholder = P[0]
    const step = function () {
      if (pm === 'hold') {
        pm = 'del'
        tId = setTimeout(step, 30)
      } else if (pm === 'del') {
        pl--
        q.placeholder = P[ph].slice(0, pl)
        if (pl <= 0) {
          ph = (ph + 1) % P.length
          pm = 'typ'
          tId = setTimeout(step, 400)
        } else tId = setTimeout(step, 30)
      } else {
        pl++
        q.placeholder = P[ph].slice(0, pl)
        if (pl >= P[ph].length) {
          pm = 'hold'
          tId = setTimeout(step, 2600)
        } else tId = setTimeout(step, 55)
      }
    }
    tId = setTimeout(step, 2600)
    q.onfocus = function () {
      if (tId !== undefined) clearTimeout(tId)
    }
  }
  root.querySelectorAll<HTMLButtonElement>('.sg button').forEach(function (x) {
    x.onclick = function () {
      if (!q) return
      q.value =
        'Quy định về ' +
        (x.textContent ?? '').toLowerCase() +
        ' khi tính thuế TNDN?'
      q.focus()
    }
  })

  const st = root.querySelector<HTMLElement>('.stage')
  if (st && !rdc && matchMedia('(pointer:fine)').matches) {
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let run = false
    const loop = function () {
      cx += (tx - cx) * 0.09
      cy += (ty - cy) * 0.09
      st.style.setProperty('--ry', (cx * 7).toFixed(3) + 'deg')
      st.style.setProperty('--rx', (-cy * 7).toFixed(3) + 'deg')
      if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) {
        requestAnimationFrame(loop)
      } else run = false
    }
    const kick = function () {
      if (!run) {
        run = true
        requestAnimationFrame(loop)
      }
    }
    st.addEventListener('pointermove', function (e) {
      const rr = st.getBoundingClientRect()
      tx = (e.clientX - rr.left) / rr.width - 0.5
      ty = (e.clientY - rr.top) / rr.height - 0.5
      st.style.setProperty('--mx', ((tx + 0.5) * 100).toFixed(1) + '%')
      st.style.setProperty('--my', ((ty + 0.5) * 100).toFixed(1) + '%')
      kick()
    })
    st.addEventListener('pointerleave', function () {
      tx = 0
      ty = 0
      kick()
    })
    if (h1)
      h1.addEventListener('pointermove', function (e) {
        const rr = h1.getBoundingClientRect()
        h1.style.setProperty(
          '--mx',
          (((e.clientX - rr.left) / rr.width) * 100).toFixed(1) + '%'
        )
        h1.style.setProperty(
          '--my',
          (((e.clientY - rr.top) / rr.height) * 100).toFixed(1) + '%'
        )
      })
  }

  if (!rdc) {
    const hc2 = root.querySelector<HTMLElement>('.hcopy')
    const hero2 = root.querySelector<HTMLElement>('.hero')
    if (hc2 && hero2) {
      let sf = false
      const sTick = function () {
        sf = false
        const y = window.scrollY
        if (y > hero2.offsetHeight) {
          if (st) st.style.setProperty('--sy', '0px')
          hc2.style.setProperty('--hy', '0px')
        } else {
          if (st) st.style.setProperty('--sy', (-y * 0.06).toFixed(1) + 'px')
          hc2.style.setProperty('--hy', (y * 0.025).toFixed(1) + 'px')
        }
      }
      onScroll = function () {
        if (!sf) {
          sf = true
          requestAnimationFrame(sTick)
        }
      }
      window.addEventListener('scroll', onScroll, { passive: true })
    }
  }

  function countUp(el: Element) {
    if (rdc) return
    el.querySelectorAll('.nu').forEach(function (s) {
      const to = Number(s.getAttribute('data-to'))
      let t0 = 0
      requestAnimationFrame(function f(ts: number) {
        if (!t0) t0 = ts
        const p = Math.min((ts - t0) / 1100, 1)
        s.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(f)
      })
    })
  }
  const io = new IntersectionObserver(
    function (l) {
      l.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          if (e.target.classList.contains('stats')) countUp(e.target)
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  root.querySelectorAll('.rv').forEach(function (x, i) {
    ;(x as HTMLElement).style.transitionDelay = (i % 3) * 80 + 'ms'
    io.observe(x)
  })

  /* ===== IIFE #2: Sàn Chuyên gia + modal ===== */
  const ex = d.getElementById('ex') as HTMLDivElement
  const fl = d.getElementById('fl') as HTMLDivElement
  let last: HTMLElement | null = null
  const mo = d.createElement('div')
  mo.className = 'mo'
  mo.setAttribute('role', 'dialog')
  mo.setAttribute('aria-modal', 'true')
  mo.setAttribute('aria-labelledby', 'mn1')
  root.appendChild(mo)

  type Expert = {
    n: string
    r: string
    i: string
    c: string
    y: number
    s: string
    p: string
    t: string[]
  }
  const X: Expert[] = [
    {
      n: 'Chuyên gia A',
      r: 'Đại lý thuế',
      i: 'A',
      c: '#C2410C',
      y: 10,
      s: '4.9',
      p: '1.500.000',
      t: ['Quyết toán TNDN', 'Chi phí được trừ', 'Lập hồ sơ giải trình'],
    },
    {
      n: 'Chuyên gia B',
      r: 'Kế toán trưởng',
      i: 'B',
      c: '#2563EB',
      y: 15,
      s: '5.0',
      p: '1.800.000',
      t: ['Hồ sơ giải trình', 'Kiểm soát nội bộ', 'Rà soát chi phí'],
    },
    {
      n: 'Chuyên gia C',
      r: 'Chuyên gia pháp lý',
      i: 'C',
      c: '#047857',
      y: 8,
      s: '4.8',
      p: '1.200.000',
      t: ['Văn bản quy phạm', 'Rủi ro tuân thủ', 'Giải trình biên bản'],
    },
    {
      n: 'Chuyên gia D',
      r: 'Đại lý thuế',
      i: 'D',
      c: '#B45309',
      y: 12,
      s: '4.9',
      p: '1.500.000',
      t: ['Ưu đãi thuế', 'Rà soát hồ sơ', 'Hoàn thuế'],
    },
  ]
  const SL = [
    ['Hôm nay', '16:00 - 17:00'],
    ['Ngày mai', '14:00 - 15:00'],
    ['Thứ Sáu', '08:30 - 09:30'],
  ]

  function ic(n: string, s?: number) {
    return (
      '<svg class="i"' +
      (s ? ' style="width:' + s + 'px;height:' + s + 'px"' : '') +
      '><use href="#i-' +
      n +
      '"/></svg>'
    )
  }
  function tg(a: string[]) {
    return a
      .map(function (t) {
        return '<span>' + t + '</span>'
      })
      .join('')
  }
  function card(e: Expert, k: number) {
    return (
      '<div class="ec"><div class="eh"><button class="ea" style="--c:' +
      e.c +
      '" data-k="' +
      k +
      '" aria-label="Xem hồ sơ ' +
      e.n +
      '">' +
      e.i +
      '</button><div><button class="en" data-k="' +
      k +
      '">' +
      e.n +
      ic('shield') +
      '</button><span class="er">' +
      e.r +
      '</span><span class="es">Chức danh, đơn vị (ví dụ) · ' +
      e.y +
      ' năm KN</span></div></div><div class="rt">' +
      ic('star') +
      '<b>' +
      e.s +
      '</b><span>(xx đánh giá)</span></div><div><div class="lb">Chuyên sâu năng lực:</div><div class="tg">' +
      tg(e.t) +
      '</div></div><div class="ef"><div class="pr"><small>Phí tư vấn</small><strong>' +
      e.p +
      'đ</strong><em>/60 phút</em></div><div class="eb"><button class="btn o" data-k="' +
      k +
      '">Hồ sơ</button><a class="btn p" href="#register">Đặt lịch ngay</a></div></div></div>'
    )
  }
  function draw(f: string) {
    ex.innerHTML = X.map(function (e, i) {
      return !f || e.r === f ? card(e, i) : ''
    }).join('')
  }
  draw('')
  fl.onclick = function (ev) {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button')
    if (!b) return
    fl.querySelectorAll('button').forEach(function (x) {
      x.classList.remove('on')
    })
    b.classList.add('on')
    draw(b.dataset.k ?? '')
  }

  function open(k: string) {
    const e = X[Number(k)]
    last = d.activeElement as HTMLElement | null
    mo.innerHTML =
      '<div class="md"><div class="mt"><i></i><span>Hồ sơ năng lực chuyên gia xác thực</span><span class="sl">GATE 1 SEAL</span><button id="mx" aria-label="Đóng">' +
      ic('x', 22) +
      '</button></div><div class="mb">' +
      '<div class="mc"><div class="mp"><div class="eh"><span class="ea" style="--c:' +
      e.c +
      '">' +
      e.i +
      '</span><div><h3 id="mn1" class="en" style="cursor:default">' +
      e.n +
      ic('shield') +
      '</h3><span class="er">' +
      e.r +
      '</span><span class="es">Chức danh, đơn vị (ví dụ) · ' +
      e.y +
      ' năm KN</span></div></div><div class="mf"><small>Mức phí cam kết (ví dụ)</small><strong>' +
      e.p +
      'đ</strong><em>/60 phút</em><small>Ký quỹ Smart Escrow</small></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px"><div class="rt">' +
      ic('star') +
      '<b>' +
      e.s +
      '</b><span>(xx đánh giá)</span></div><span class="ch v">' +
      ic('shield', 14) +
      'GATE 1 · Điều kiện pháp lý #xxxx</span><span class="ch v">' +
      ic('shield', 14) +
      'GATE 2 · Năng lực chuyên môn</span></div></div>' +
      '<div class="mc"><h5>' +
      ic('file') +
      'Tóm tắt quá trình & Cột mốc chuyên môn</h5><p>Phần này hiển thị tóm tắt quá trình công tác và các cột mốc chuyên môn do chuyên gia cung cấp, đã qua thẩm định Gate 1 và Gate 2. Nội dung hiện tại là dữ liệu minh họa.</p></div>' +
      '<div class="mc"><h5>' +
      ic('award') +
      'Lĩnh vực tư vấn chuyên sâu & Kinh nghiệm thực chiến</h5><div class="tg">' +
      tg(e.t.concat(['Chi phí không được trừ'])) +
      '</div></div>' +
      '<div class="mc"><h5>' +
      ic('cal') +
      'Lịch tư vấn mở gần nhất (Trực tuyến 1:1)<small>Google Meet · lịch minh họa</small></h5><div class="sg2">' +
      SL.map(function (s) {
        return (
          '<button class="sv" aria-pressed="false"><span class="rd"></span><span><b>' +
          s[0] +
          ' · ' +
          s[1] +
          '</b><small>Còn chỗ</small></span><span class="pk">Chọn</span></button>'
        )
      }).join('') +
      '</div></div>' +
      '</div><div class="mx"><span>' +
      ic('lock', 16) +
      'Bảo lưu 100% chi phí qua Smart Escrow cho đến khi nghiệm thu.</span><div class="eb"><a class="btn o" href="#">' +
      ic('dl', 16) +
      'Tải hồ sơ (PDF)</a><a class="btn p" href="#register">' +
      ic('cal', 16) +
      'Đặt lịch tư vấn ngay</a></div></div></div>'
    mo.classList.add('on')
    r.style.overflow = 'hidden'
    mo.querySelector<HTMLButtonElement>('#mx')?.focus()
  }
  function close() {
    mo.classList.remove('on')
    r.style.overflow = prevHtmlOverflow
    if (last) last.focus()
  }
  ex.addEventListener('click', function (ev) {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-k]')
    if (b && b.dataset.k !== undefined) open(b.dataset.k)
  })
  mo.addEventListener('click', function (ev) {
    const target = ev.target as HTMLElement
    if (ev.target === mo || target.closest('#mx')) return close()
    const s = target.closest<HTMLElement>('.sv')
    if (s) {
      mo.querySelectorAll<HTMLElement>('.sv').forEach(function (x) {
        x.classList.remove('on')
        x.setAttribute('aria-pressed', 'false')
      })
      s.classList.add('on')
      s.setAttribute('aria-pressed', 'true')
      const pk = s.querySelector<HTMLElement>('.pk')
      if (pk) pk.textContent = 'Đã chọn'
    }
  })
  const onKeydown = function (ev: KeyboardEvent) {
    if (!mo.classList.contains('on')) return
    if (ev.key === 'Escape') return close()
    if (ev.key === 'Tab') {
      const f = mo.querySelectorAll<HTMLElement>('button,a[href]')
      const a = f[0]
      const z = f[f.length - 1]
      if (!a || !z) return
      if (ev.shiftKey && d.activeElement === a) {
        z.focus()
        ev.preventDefault()
      } else if (!ev.shiftKey && d.activeElement === z) {
        a.focus()
        ev.preventDefault()
      }
    }
  }
  d.addEventListener('keydown', onKeydown)

  /* ===== Cleanup khi rời route ===== */
  return function () {
    if (tId !== undefined) clearTimeout(tId)
    if (plUL) window.removeEventListener('resize', plUL)
    if (onScroll) window.removeEventListener('scroll', onScroll)
    io.disconnect()
    d.removeEventListener('keydown', onKeydown)
    mo.remove()
    d.title = prevTitle
    r.style.scrollBehavior = prevScrollBehavior
    r.style.scrollPaddingTop = prevScrollPaddingTop
    r.style.overflow = prevHtmlOverflow
    d.body.style.overflowX = prevBodyOverflowX
  }
}
