import { useEffect, useRef, type CSSProperties } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { initHomepage } from './homepage-scripts'
import './homepage.css'

/* Markup port nguyên khối từ FE/SHUB Homepage.html (giữ nguyên class/id/nội dung).
   Khác bản gốc — xem docs/HOMEPAGE.md:
   - Bọc #shub-home (scope CSS) + class js tĩnh.
   - Style inline → object; href map: #login/#register → /login,
     #register-expert → /expert/register; fragment còn lại giữ nguyên.
   - Nút #th dùng useTheme() của app (icon theo isDark). */
export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    return initHomepage(el)
  }, [])

  return (
    <div id="shub-home" className="js" ref={rootRef}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="i-arrow" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </symbol>
          <symbol id="i-shield" viewBox="0 0 24 24">
            <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.500-1.200 6.200-2.700a1.200 1.200 0 0 1 1.500 0C14.500 3.800 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </symbol>
          <symbol id="i-spark" viewBox="0 0 24 24">
            <path d="M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900z" />
          </symbol>
          <symbol id="i-search" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.300-4.300" />
          </symbol>
          <symbol id="i-file" viewBox="0 0 24 24">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8" />
          </symbol>
          <symbol id="i-users" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.900M16 3.100a4 4 0 0 1 0 7.800" />
          </symbol>
          <symbol id="i-build" viewBox="0 0 24 24">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 13v.01M9 17v.01" />
          </symbol>
          <symbol id="i-award" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="6" />
            <path d="m15.500 12.900 1.500 9.100-5-3-5 3 1.500-9.100" />
          </symbol>
          <symbol id="i-sun" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400" />
          </symbol>
          <symbol id="i-moon" viewBox="0 0 24 24">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
          </symbol>
          <symbol id="i-eye" viewBox="0 0 24 24">
            <path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </symbol>
          <symbol id="i-menu" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </symbol>
          <symbol id="i-x" viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </symbol>
          <symbol id="i-star" viewBox="0 0 24 24">
            <path d="m12 2 3.100 6.300 6.900 1-5 4.900 1.200 6.900-6.200-3.300-6.200 3.300L7 14.200l-5-4.900 6.900-1z" />
          </symbol>
          <symbol id="i-dl" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </symbol>
          <symbol id="i-cal" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </symbol>
          <symbol id="i-lock" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </symbol>
        </defs>
      </svg>

      <header>
        <div className="w nav">
          <a className="logo" href="#">
            <span className="mark">
              <svg className="i">
                <use href="#i-shield" />
              </svg>
            </span>
            SHUB
          </a>
          <nav className="links" id="nv">
            <a href="#ai-assistant">Trợ lý AI</a>
            <a href="#workspace">AI Workspace</a>
            <a href="#marketplace">Sàn Chuyên gia</a>
            <a href="#pricing">Bảng giá</a>
            <a href="#help">Trung tâm trợ giúp</a>
          </nav>
          <div className="act">
            <button
              className="ib"
              id="th"
              aria-label="Đổi giao diện sáng/tối"
              onClick={toggleTheme}
            >
              <svg className="i">
                <use href={isDark ? '#i-sun' : '#i-moon'} />
              </svg>
            </button>
            <a className="btn g" href="/login">
              Đăng nhập
            </a>
            <a className="btn p" href="/login">
              Đăng ký
            </a>
            <button className="ib menu" id="mn" aria-label="Menu">
              <svg className="i">
                <use href="#i-menu" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hgl" aria-hidden="true"></div>
          <div className="w">
            <div className="hgrid">
              <div className="hcopy">
                <span className="ch o rise d1">
                  <svg className="i" style={{ width: 14, height: 14 }}>
                    <use href="#i-shield" />
                  </svg>
                  Thuế TNDN · AI-First, Human-Verified
                </span>
                <h1>Hỏi AI. Nhận bản nháp. <span className="hl">Chuyên gia xác thực.</span><svg className="hul" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="100" vectorEffect="non-scaling-stroke" d="M7,9.4 C54,4.6 98,11.2 150,7.6 C200,4.2 246,10.6 293,6.4" /></svg></h1>
                <p className="sub rise d3">
                  SHUB giúp SME và kế toán tra cứu, soạn thảo hồ sơ Thuế TNDN với
                  trích dẫn Điều/Khoản từ kho văn bản đã kiểm duyệt, rồi đặt
                  chuyên gia rà soát để có bản Verified.
                </p>
                <div className="ask rise d4">
                  <svg className="i">
                    <use href="#i-spark" />
                  </svg>
                  <input
                    id="q"
                    type="text"
                    aria-label="Câu hỏi về Thuế TNDN"
                    placeholder="Chi phí phúc lợi cho nhân viên có được trừ khi tính thuế TNDN không?"
                  />
                  <a className="btn p" href="/login">
                    Hỏi AI{' '}
                    <svg className="i" style={{ width: 16, height: 16 }}>
                      <use href="#i-arrow" />
                    </svg>
                  </a>
                </div>
                <div className="note rise d5">
                  <div className="sg">
                    <button>Chiết khấu thương mại</button>
                    <button>Chi phí lãi vay</button>
                    <button>Chi phí không được trừ</button>
                  </div>
                  <span className="ch o">Phạm vi: Thuế TNDN</span>
                </div>
                <p
                  className="note rise d6"
                  style={{
                    marginTop: '8px',
                    justifyContent: 'flex-start',
                    color: 'var(--mut)',
                  }}
                >
                  Kết quả AI là bản nháp tham khảo; cần chuyên gia rà soát để có
                  bản Verified.
                </p>
              </div>
              <div className="stage" aria-hidden="true">
                <span className="stglow"></span>
                <span className="ring a"></span>
                <span className="ring b"></span>
                <article className="ly dr">
                  <div className="ly-bar">
                    <span className="dots">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <span className="fname">Ho-so-TNDN-2026 · bản nháp</span>
                    <span className="ch d">
                      <svg className="i" style={{ width: 12, height: 12 }}>
                        <use href="#i-spark" />
                      </svg>
                      AI
                    </span>
                  </div>
                  <p className="pb">
                    Chi phí lãi vay được tính vào chi phí được trừ{' '}
                    <del>không giới hạn</del>.
                    <sup className="fn">1</sup>
                  </p>
                  <div className="pf">
                    <span className="ch d cit">
                      <b>1</b>Điều X · Khoản Y
                    </span>
                    <span className="ch d cit">Thông tư XX/20XX</span>
                  </div>
                  <span className="ly-foot">
                    <span className="dotpulse"></span>Đang sinh bản nháp…
                  </span>
                </article>
                <span className="link"></span>
                <span className="pulse"></span>
                <span className="rvpill">
                  <i>
                    <svg className="i">
                      <use href="#i-eye" />
                    </svg>
                  </i>
                  Chuyên gia rà soát
                </span>
                <article className="ly vr">
                  <div className="ly-bar">
                    <span className="dots v">
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <span className="fname">Ho-so-TNDN-2026 · Verified</span>
                    <span className="ch v">
                      <svg className="i" style={{ width: 12, height: 12 }}>
                        <use href="#i-shield" />
                      </svg>
                      Gate 2
                    </span>
                  </div>
                  <p className="pb">
                    Chi phí lãi vay được tính vào chi phí được trừ{' '}
                    <ins>trong giới hạn theo quy định</ins>.
                    <sup className="fn v">2</sup>
                  </p>
                  <div className="pf">
                    <span className="ch v cit">
                      <b>2</b>Điều X · Khoản Y
                    </span>
                    <span className="ch v cit">Thông tư XX/20XX</span>
                  </div>
                  <span className="ly-foot v">
                    <svg className="i" style={{ width: 14, height: 14 }}>
                      <use href="#i-shield" />
                    </svg>
                    2 thay đổi · 1 trích dẫn bổ sung
                  </span>
                  <span className="stamp">VERIFIED</span>
                </article>
                <span className="fc ch d c1">Điều X · Khoản Y</span>
                <span className="fc ch v c2">Gate 2 · Năng lực chuyên môn</span>
                <span className="fc ch o c3">
                  <svg className="i" style={{ width: 14, height: 14 }}>
                    <use href="#i-lock" />
                  </svg>
                  Smart Escrow
                </span>
              </div>
            </div>
            <ol className="flow rv">
              <li style={{ '--c': '#C2410C' } as CSSProperties}>
                <b>1</b>Hỏi AI
              </li>
              <li style={{ '--c': '#2563EB' } as CSSProperties}>
                <b>2</b>Bản nháp AI
              </li>
              <li style={{ '--c': '#B45309' } as CSSProperties}>
                <b>3</b>Chuyên gia rà soát
              </li>
              <li style={{ '--c': '#047857' } as CSSProperties}>
                <b>4</b>Bản Verified
              </li>
            </ol>
            <div className="stats rv">
              <div>
                <strong>
                  Đến <span className="nu" data-to="70">70</span>%
                </strong>
                <span>thời gian tra cứu và soạn thảo</span>
              </div>
              <div>
                <strong>
                  <span className="nu" data-to="100">100</span>%
                </strong>
                <span>trích dẫn chính xác số hiệu, Điều/Khoản</span>
              </div>
              <div>
                <strong>
                  <span className="nu" data-to="24">24</span>h /{' '}
                  <span className="nu" data-to="72">72</span>h
                </strong>
                <span>SLA rà soát của chuyên gia</span>
              </div>
            </div>
          </div>
        </section>

        <section className="alt">
          <div className="w">
            <div className="g2">
              <div className="portal dk rv">
                <div className="pi">
                  <svg className="i" style={{ width: 28, height: 28 }}>
                    <use href="#i-build" />
                  </svg>
                </div>
                <h3>Dành cho Doanh nghiệp & Kế toán</h3>
                <p>
                  Rà soát và lập hồ sơ Thuế TNDN nhanh hơn với AI, rồi đặt
                  chuyên gia xác thực khi cần.
                </p>
                <a className="lnk" href="#workspace">
                  Khám phá AI Workspace{' '}
                  <svg className="i">
                    <use href="#i-arrow" />
                  </svg>
                </a>
              </div>
              <div className="portal lt rv">
                <div className="pi">
                  <svg className="i" style={{ width: 28, height: 28 }}>
                    <use href="#i-award" />
                  </svg>
                </div>
                <h3>Dành cho Chuyên gia Thuế</h3>
                <p>
                  Tham gia mạng lưới chuyên gia qua 2 cổng thẩm định: điều kiện
                  pháp lý và năng lực chuyên môn.
                </p>
                <a className="lnk" href="/expert/register">
                  Đăng ký trở thành Chuyên gia{' '}
                  <svg className="i">
                    <use href="#i-arrow" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="w">
            <div className="head rv">
              <h2>Ba cổng vào một quy trình khép kín</h2>
              <p>
                Từ tra cứu, soạn thảo đến xác thực, mỗi bước có một nơi riêng và
                nối liền nhau.
              </p>
            </div>
            <div className="bento">
              <a
                className="card t rv"
                href="#ai-assistant"
                id="ai-assistant"
              >
                <svg
                  className="i"
                  style={{ color: 'var(--br)', width: 28, height: 28 }}
                >
                  <use href="#i-search" />
                </svg>
                <h3>Tra cứu AI (RAG)</h3>
                <p>
                  Hỏi đáp Thuế TNDN với trích dẫn Điều/Khoản từ kho văn bản đã
                  kiểm duyệt, trong phạm vi CIT.
                </p>
                <div className="chat">
                  <div className="bu">Chi phí phúc lợi có được trừ không?</div>
                  <div className="ba">
                    Có thể được trừ nếu đáp ứng điều kiện theo quy định...
                    <br />
                    <span className="ch d">Điều X · Khoản Y</span>
                    <span className="ch d">Thông tư XX/20XX</span>
                  </div>
                  <span className="demo">
                    Ví dụ minh họa, số hiệu là placeholder
                  </span>
                </div>
                <span className="more">
                  Tìm hiểu thêm{' '}
                  <svg className="i" style={{ width: 16, height: 16 }}>
                    <use href="#i-arrow" />
                  </svg>
                </span>
              </a>
              <a className="card rv" href="#workspace" id="workspace">
                <svg
                  className="i"
                  style={{ color: 'var(--br)', width: 28, height: 28 }}
                >
                  <use href="#i-file" />
                </svg>
                <h3>AI Workspace</h3>
                <p>
                  Sinh bản nháp tờ khai 03/TNDN và công văn giải trình, sẵn
                  sàng cho bước rà soát.
                </p>
                <div className="sk">
                  <span className="ch d" style={{ alignSelf: 'flex-start' }}>
                    Bản nháp AI
                  </span>
                  <i></i>
                  <i style={{ width: '82%' }}></i>
                  <i style={{ width: '64%' }}></i>
                </div>
                <span className="more">
                  Tìm hiểu thêm{' '}
                  <svg className="i" style={{ width: 16, height: 16 }}>
                    <use href="#i-arrow" />
                  </svg>
                </span>
              </a>
              <a className="card rv" href="#marketplace">
                <svg
                  className="i"
                  style={{ color: 'var(--br)', width: 28, height: 28 }}
                >
                  <use href="#i-users" />
                </svg>
                <h3>Sàn Chuyên gia</h3>
                <p>
                  Đặt chuyên gia đã qua 2 cổng thẩm định để rà soát và xác thực
                  hồ sơ của bạn.
                </p>
                <div className="av">
                  <span style={{ '--c': '#C2410C' } as CSSProperties}>A</span>
                  <span style={{ '--c': '#2563EB' } as CSSProperties}>B</span>
                  <span style={{ '--c': '#047857' } as CSSProperties}>C</span>
                </div>
                <span className="more">
                  Tìm hiểu thêm{' '}
                  <svg className="i" style={{ width: 16, height: 16 }}>
                    <use href="#i-arrow" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </section>

        <section className="alt">
          <div className="w">
            <div className="head c rv">
              <h2>Quản lý phiên bản bất biến</h2>
              <p>
                Bản nháp AI và bản Verified được lưu riêng, so sánh minh bạch,
                truy vết được.
              </p>
            </div>
            <div className="cmp">
              <div className="doc rv">
                <div className="dh">
                  <span className="ch d">
                    <svg className="i" style={{ width: 14, height: 14 }}>
                      <use href="#i-spark" />
                    </svg>
                    Bản nháp AI
                  </span>
                  <span className="demo">Ví dụ minh họa</span>
                </div>
                <div className="db">
                  Theo <b>Điều X</b> Thông tư số XX/20XX/TT-BTC, chi phí phúc
                  lợi chi cho người lao động được tính vào chi phí được trừ{' '}
                  <del>nếu có chứng từ</del>.
                </div>
              </div>
              <div className="mid">
                <i>
                  <svg className="i">
                    <use href="#i-eye" />
                  </svg>
                </i>
                Chuyên gia
                <br />
                rà soát
              </div>
              <div className="doc v rv">
                <div className="dh">
                  <span className="ch v">
                    <svg className="i" style={{ width: 14, height: 14 }}>
                      <use href="#i-shield" />
                    </svg>
                    Verified
                  </span>
                  <span className="demo">Chuyên gia (ví dụ)</span>
                </div>
                <div className="db">
                  Theo <b>Điều X, Khoản Y</b> Thông tư số XX/20XX/TT-BTC, chi
                  phí phúc lợi chi cho người lao động được tính vào chi phí được
                  trừ{' '}
                  <ins>
                    khi đáp ứng đủ điều kiện và trong mức chi giới hạn theo quy
                    định
                  </ins>
                  .
                </div>
                <div className="stamp">VERIFIED</div>
              </div>
            </div>
            <p className="cap rv">
              Phiên bản mới nhất ≠ phiên bản Verified. Mỗi bản Verified là bất
              biến, không bị ghi đè.
            </p>
          </div>
        </section>

        <section id="marketplace">
          <div className="w">
            <div
              className="head rv"
              style={{
                maxWidth: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'end',
                gap: '16px',
              }}
            >
              <div style={{ maxWidth: '620px' }}>
                <h2>Sàn Chuyên gia</h2>
                <p>
                  Chuyên gia đã qua 2 cổng thẩm định: điều kiện pháp lý và năng
                  lực chuyên môn.
                </p>
              </div>
              <a className="lnk" href="#marketplace">
                Xem toàn bộ Sàn Chuyên gia{' '}
                <svg className="i">
                  <use href="#i-arrow" />
                </svg>
              </a>
            </div>
            <div className="fl rv" id="fl">
              <button className="on" data-k="">
                Tất cả
              </button>
              <button data-k="Đại lý thuế">Đại lý thuế</button>
              <button data-k="Kế toán trưởng">Kế toán trưởng</button>
              <button data-k="Chuyên gia pháp lý">Chuyên gia pháp lý</button>
            </div>
            <div className="ex" id="ex"></div>
            <p
              className="demo"
              style={{ marginTop: '20px', textAlign: 'center' }}
            >
              Dữ liệu minh họa, hồ sơ chuyên gia thật sẽ thay thế.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="w">
          <div className="fg">
            <div>
              <a className="logo" href="#" style={{ color: '#fff' }}>
                <span className="mark">
                  <svg className="i">
                    <use href="#i-shield" />
                  </svg>
                </span>
                SHUB
              </a>
              <p style={{ margin: '18px 0', fontSize: '14px', maxWidth: '300px' }}>
                Nền tảng AI Workspace kết hợp Xác thực Chuyên gia cho SME ngành
                Tài chính & Thuế.
              </p>
              <a href="#" style={{ fontSize: '13px' }}>
                Thuộc hệ sinh thái AI Coaching Vietnam
              </a>
            </div>
            <div>
              <h4>Sản phẩm</h4>
              <ul>
                <li>
                  <a href="#ai-assistant">Trợ lý AI</a>
                </li>
                <li>
                  <a href="#workspace">AI Workspace</a>
                </li>
                <li>
                  <a href="#pricing">Bảng giá & Credit</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Chuyên gia</h4>
              <ul>
                <li>
                  <a href="#marketplace">Sàn Chuyên gia</a>
                </li>
                <li>
                  <a href="/expert/register">Đăng ký đối tác</a>
                </li>
                <li>
                  <a href="#standards">Tiêu chuẩn thẩm định</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Hỗ trợ & Pháp lý</h4>
              <ul>
                <li>
                  <a href="#help">Trung tâm trợ giúp</a>
                </li>
                <li>
                  <a href="#contact">Liên hệ</a>
                </li>
                <li>
                  <a href="#terms">Điều khoản dịch vụ</a>
                </li>
                <li>
                  <a href="#privacy">Chính sách bảo mật</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="wm" aria-hidden="true">
            SHUB
          </div>
          <p className="dis">
            <b>Khước từ trách nhiệm:</b> Nội dung do AI (Trợ lý AI, AI Workspace)
            sinh ra chỉ là bản nháp tham khảo, không phải tư vấn pháp lý hay thuế
            chính thức. Để có bản xác thực, tài liệu cần được chuyên gia trên nền
            tảng rà soát và cấp bản Verified. Vui lòng xem{' '}
            <a href="#terms" style={{ textDecoration: 'underline' }}>
              Điều khoản sử dụng
            </a>
            . © 2026 SHUB.
          </p>
        </div>
      </footer>
    </div>
  )
}
