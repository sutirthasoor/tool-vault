import {useEffect,useRef,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {useTools,useSlides,brandsOf,ToolCard,BrandIcon,CATS} from './shared';

import {IC} from './Shell';
const Ic=({d,s=16})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

function Hero(){const slides=useSlides();const [i,setI]=useState(0);const [hold,setHold]=useState(false);const sx=useRef(0);const n=slides.length;
  useEffect(()=>{if(i>=n)setI(0)},[n,i]);
  useEffect(()=>{if(n<2||hold||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const t=setInterval(()=>setI(v=>(v+1)%n),5500);return()=>clearInterval(t)},[n,hold]);
  if(!n)return null;const go=d=>setI(v=>(v+d+n)%n);
  return <section className="hbanner" aria-roledescription="carousel" aria-label="Featured" onMouseEnter={()=>setHold(true)} onMouseLeave={()=>setHold(false)}
    onTouchStart={e=>{sx.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-sx.current;if(Math.abs(d)>50)go(d<0?1:-1)}}>
    <div className="hb-track" style={{transform:`translateX(-${i*100}%)`}}>{slides.map((h,k)=>{const txt=h.title||h.subtitle,ext=/^https?:/.test(h.link||'');
      return <div key={h.id} className={'hb-slide'+(txt?' hb-t':'')} aria-hidden={k!==i} aria-roledescription="slide">
        <img src={h.image} alt={h.title||`Slide ${k+1}`} loading={k===0?'eager':'lazy'} decoding="async"/>
        {txt&&<div className="wrap hb-in">{h.title&&<h1>{h.title}</h1>}{h.subtitle&&<p>{h.subtitle}</p>}
          {h.link&&(ext?<a href={h.link} className="btn lg" tabIndex={k===i?0:-1}>Shop now</a>:<Link to={h.link} className="btn lg" tabIndex={k===i?0:-1}>Shop now</Link>)}</div>}</div>})}</div>
    {n>1&&<><button className="hb-nav prev" onClick={()=>go(-1)} aria-label="Previous slide">‹</button><button className="hb-nav next" onClick={()=>go(1)} aria-label="Next slide">›</button>
      <div className="hb-dots">{slides.map((_,k)=><button key={k} className={k===i?'on':''} onClick={()=>setI(k)} aria-label={`Go to slide ${k+1}`}/>)}</div></>}</section>;}

function Row({icon,label,items,rev}){const list=[...items,...items];
  return <div className="mq"><div className="mq-l"><Ic d={icon} s={15}/><span>{label}</span></div><div className="mq-w"><div className={'mq-t'+(rev?' rev':'')}>{list.map((t,i)=><Link key={i} to={`/products/${t.id}`} className="mq-i"><span className={'mq-b '+(t.access==='free'?'f':'p')}>{t.access==='free'?'Free':'Paid'}</span><span className="mq-d">{t.purchaseDate}</span><span>{t.name}</span></Link>)}</div></div></div>;}

function Bands({tools}){if(!tools?.length)return null;
  const recent=[...tools].sort((a,b)=>(b.purchaseDate||'').localeCompare(a.purchaseDate||'')).slice(0,10);const free=tools.filter(t=>t.access==='free').slice(0,10);
  return <section className="band"><div className="wrap"><Row icon={IC.clock} label="New arrivals" items={recent}/>{!!free.length&&<Row icon={IC.gift} label="Free downloads" items={free} rev/>}</div></section>;}

function Promo(){return <section className="wrap promo"><Link to="/products" className="tile big t1"><small>Marketplace</small><h2>Flash files, firmware and tools in one place</h2><p>Pick a brand, buy once and get the link and password right away.</p><span className="btn sm">Shop all products</span></Link>
  <Link to="/products?f=free" className="tile t2"><small>No account needed</small><h3>Free tools</h3><span className="tl">Browse free →</span></Link>
  <Link to="/wallet" className="tile t3"><small>Faster checkout</small><h3>Top up your wallet</h3><span className="tl">Open wallet →</span></Link></section>;}

const Head=({t,to})=><div className="sh"><h2>{t}</h2>{to&&<Link to={to}>View all →</Link>}</div>;

export function Home(){const tools=useTools();const brands=brandsOf(tools);
  const free=(tools||[]).filter(t=>t.access==='free').slice(0,6),latest=[...(tools||[])].sort((a,b)=>(b.purchaseDate||'').localeCompare(a.purchaseDate||'')).slice(0,6);
  return <><Hero/><Bands tools={tools}/><Promo/>
    <section className="wrap sec2"><Head t="Shop by brand"/>{!tools?<p className="muted">Loading…</p>:!brands.length?<p className="muted">No brands yet. Add tools from the admin panel.</p>:<div className="fgrid3">{brands.map(b=><BrandIcon key={b.name} {...b}/>)}</div>}</section>
    {!!latest.length&&<section className="wrap sec2"><Head t="New arrivals" to="/products?s=new"/><div className="pgrid">{latest.map(t=><ToolCard key={t.id} t={t}/>)}</div></section>}
    {!!free.length&&<section className="wrap sec2"><Head t="Free tools" to="/products?f=free"/><div className="pgrid">{free.map(t=><ToolCard key={t.id} t={t}/>)}</div></section>}
    <section className="wrap sec2"><Head t="Shop by category"/><div className="fgrid3">{CATS.map(c=><Link key={c} to={`/products?c=${encodeURIComponent(c)}`} className="fcard"><span className="fico sq">{c[0]}</span><div className="ftxt"><b>{c}</b></div></Link>)}</div></section>
    <section className="wrap sec2 perks"><div><Ic d={IC.zap} s={20}/><b>Instant access</b><p className="muted sm">Link and password appear right after purchase.</p></div><div><Ic d={IC.wallet} s={20}/><b>Wallet balance</b><p className="muted sm">Top up once and check out in a click.</p></div><div><Ic d={IC.shield} s={20}/><b>Your library</b><p className="muted sm">Every purchase stays in My downloads.</p></div></section></>;}

const sorters={name:(a,b)=>a.name.localeCompare(b.name),low:(a,b)=>a.price-b.price,high:(a,b)=>b.price-a.price,new:(a,b)=>(b.purchaseDate||'').localeCompare(a.purchaseDate||'')};
export function Products(){const tools=useTools();const {brand}=useParams();const [sp,setSp]=useSearchParams();const [n,setN]=useState(12);
  const q=sp.get('q')||'',f=sp.get('f')||'all',c=sp.get('c')||'all',so=sp.get('s')||'name';const brands=brandsOf(tools);
  const list=(tools||[]).filter(t=>(!brand||t.vendor===brand)&&(f==='all'||t.access===f)&&(c==='all'||t.category===c)&&(t.name+t.vendor+(t.description||'')).toLowerCase().includes(q.toLowerCase())).sort(sorters[so]);
  const set=(k,v)=>{const x=new URLSearchParams(sp);v&&v!=='all'&&v!=='name'?x.set(k,v):x.delete(k);setSp(x)};
  const radio=(k,cur,opts)=>opts.map(([v,l])=><label key={v} className="opt"><input type="radio" checked={cur===v} onChange={()=>set(k,v)}/>{l}</label>);
  return <div className="wrap sec"><div className="crumb muted sm"><Link to="/">Home</Link> / <Link to="/products">Products</Link>{brand&&<> / {brand}</>}</div><h2>{brand||'All products'}</h2>
    <div className="shop"><aside className="filters card"><b>Brands</b><Link to="/products" className={!brand?'on':''}>All brands</Link>{brands.map(b=><Link key={b.name} to={`/brand/${encodeURIComponent(b.name)}`} className={brand===b.name?'on':''}>{b.name} ({b.count})</Link>)}
      <b>Category</b>{radio('c',c,[['all','All'],...CATS.map(x=>[x,x])])}<b>Price</b>{radio('f',f,[['all','All'],['free','Free'],['paid','Paid']])}</aside>
      <div><div className="row bar"><input placeholder="Search in this list" value={q} onChange={e=>set('q',e.target.value)}/><select value={so} onChange={e=>set('s',e.target.value)}><option value="name">Name A–Z</option><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><span className="muted sm">{list.length} results</span></div>
      {!tools?<p className="muted">Loading…</p>:!list.length?<p className="muted">No tools match. Try clearing the filters.</p>:<><div className="pgrid">{list.slice(0,n).map(t=><ToolCard key={t.id} t={t}/>)}</div>{list.length>n&&<div className="center"><button className="btn ghost" onClick={()=>setN(n+12)}>Load more</button></div>}</>}</div></div></div>;}
