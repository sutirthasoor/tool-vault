import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {collection,onSnapshot,orderBy,query} from 'firebase/firestore';
import {db} from './firebase';
import {useApp,money} from './store';
export const CATS=['Firmware','Flashing tool','Driver','Unlock tool','Software'];
export function useTools(){const [tools,setTools]=useState(null);
  useEffect(()=>onSnapshot(query(collection(db,'tools'),orderBy('name')),s=>setTools(s.docs.map(d=>({id:d.id,...d.data()})))),[]);return tools;}
// Home hero slider: one Firestore doc per slide in `banners` → {image:'data:image/jpeg;base64,…', title, subtitle, link, order}
export function useSlides(){const [s,setS]=useState([]);
  useEffect(()=>onSnapshot(query(collection(db,'banners'),orderBy('order')),x=>setS(x.docs.map(d=>({id:d.id,...d.data()})).filter(b=>b.image)),()=>setS([])),[]);return s;}
export const brandsOf=tools=>Object.entries((tools||[]).reduce((m,t)=>{const v=(t.vendor||'').trim();if(v)m[v]=(m[v]||0)+1;return m},{})).map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name));
export function BrandIcon({name,count}){return <Link to={`/brand/${encodeURIComponent(name)}`} className="fcard"><span className="fico">{name.slice(0,2)}</span><div className="ftxt"><b>{name}</b>{count!=null&&<span className="muted sm">{count} {count===1?'tool':'tools'}</span>}</div></Link>;}
export function ToolCard({t}){const {addToCart,owns,cart}=useApp();const inCart=cart.some(c=>c.id===t.id);const free=t.access==='free';
  return <div className="pc"><Link to={`/products/${t.id}`} className="pimg"><span>{t.name?.[0]}</span><i className={'pbadge '+(free?'f':'p')}>{free?'Free':'Paid'}</i></Link>
    <div className="pbody"><Link to={`/products/${t.id}`} className="ptitle">{t.name}</Link>
      <p className="pmeta">{t.vendor}{t.version&&<> · v{t.version}</>}{t.fileSize&&<> · {t.fileSize}</>}</p>
      <p className="pinst">Instant delivery</p>
      <div className="pfoot"><b className={free?'free':'price'}>{free?'Free':money(t.price)}</b>
        {free||owns(t.id)?<Link className="btn sm" to={`/products/${t.id}`}>{owns(t.id)?'Open':'Get files'}</Link>:<button className="btn sm" disabled={inCart} onClick={()=>addToCart(t)}>{inCart?'In cart':'Add to cart'}</button>}</div></div></div>;}
