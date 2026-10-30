import {useState} from 'react';
import {Link,NavLink,useNavigate} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import {auth} from './firebase';
import {useApp,money} from './store';
import {useTools,brandsOf} from './shared';

const I=({d,s=17})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
export const IC={
  search:<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  bag:<><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  home:<><path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/></>,
  grid:<><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
  down:<><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></>,
  wallet:<><path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 7l12-3v3"/><circle cx="16" cy="13.5" r="1"/></>,
  zap:<><path d="M13 3 5 13h6l-1 8 8-10h-6z"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  gift:<><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M3 9h18v-3H3zM12 6c-1-3-5-3-5-1 0 1.5 3 1 5 1zm0 0c1-3 5-3 5-1 0 1.5-3 1-5 1z"/></>,
  shield:<><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/></>
};

export function Header(){const {user,profile,cart}=useApp();const nav=useNavigate();const [q,setQ]=useState('');
  return <header className="hdr2">
    <Link to="/products?f=free" className="ann">New: free tools need no account — open the link and password in one click. <b>Browse free tools →</b></Link>
    <div className="wrap hdr2-in"><Link to="/" className="logo"><span className="mark">F</span>FlashVault</Link>
      <form className="search2" onSubmit={e=>{e.preventDefault();nav('/products?q='+encodeURIComponent(q))}}><I d={IC.search} s={15}/><input type="search" aria-label="Search" placeholder="Search flash files, tools or brands" value={q} onChange={e=>setQ(e.target.value)}/></form>
      <div className="hdr2-r">
        <Link to="/cart" className="iconbtn" aria-label={`Cart (${cart.length})`}><I d={IC.bag} s={18}/>{cart.length>0&&<i className="cnt">{cart.length}</i>}</Link>
        {user?<><Link to="/wallet" className="wallet">{money(profile?.wallet)}</Link>
          <div className="menu"><button className="hl link">{profile?.name?.split(' ')[0]||'Account'} ▾</button><div className="dd"><Link to="/account">My downloads</Link><Link to="/orders">My orders</Link><Link to="/wallet">Wallet</Link><button onClick={()=>signOut(auth).then(()=>nav('/'))}>Sign out</button></div></div></>
        :<div className="auth"><Link to="/login" className="btn ghost sm">Sign in</Link><Link to="/login" state={{reg:true}} className="btn sm">Register</Link></div>}
      </div></div>
    <div className="subnav" role="navigation"><div className="wrap"><NavLink to="/" end>Home</NavLink><NavLink to="/products">Products</NavLink></div></div>
  </header>;}

function MobileBar(){const {cart}=useApp();
  const it=(to,ic,l,end)=><NavLink to={to} end={end} className="mb-i"><I d={ic} s={19}/><span>{l}</span></NavLink>;
  return <><div className="mb-pad"/><div className="mbar" role="navigation">{it('/',IC.home,'Home',true)}{it('/products',IC.grid,'Products')}{it('/account',IC.down,'Downloads')}{it('/wallet',IC.wallet,'Wallet')}<NavLink to="/cart" className="mb-i"><span className="rel"><I d={IC.bag} s={19}/>{cart.length>0&&<i className="cnt">{cart.length}</i>}</span><span>Cart</span></NavLink></div></>;}

export function Footer(){const brands=brandsOf(useTools());
  return <><footer className="ftr"><div className="wrap fgrid">
    <div><Link to="/" className="logo"><span className="mark">F</span>FlashVault</Link><p className="muted sm">Flash files and tools from trusted vendors, delivered instantly with a link and password.</p></div>
    <div><b>Shop</b><Link to="/products">All products</Link><Link to="/products?f=free">Free tools</Link><Link to="/cart">Cart</Link>{brands.slice(0,3).map(b=><Link key={b.name} to={`/brand/${encodeURIComponent(b.name)}`}>{b.name}</Link>)}</div>
    <div><b>Company</b><Link to="/page/about">About us</Link><Link to="/page/contact">Contact</Link><Link to="/page/faq">FAQ</Link></div>
    <div><b>Legal</b><Link to="/page/terms">Terms of use</Link><Link to="/page/privacy">Privacy policy</Link><Link to="/page/refund">Refund policy</Link></div>
    <div><b>Account</b><Link to="/login">Sign in</Link><Link to="/orders">My orders</Link><Link to="/wallet">Wallet</Link></div></div>
    <div className="wrap fbase"><span>© {new Date().getFullYear()} FlashVault</span><span>Downloads are provided by their vendors.</span></div>
    <div className="fwarn" role="note">Sharing a link or password with anyone else, or posting it on another site, is not allowed. Accounts found doing so are blocked without refund.</div></footer><MobileBar/></>;}
