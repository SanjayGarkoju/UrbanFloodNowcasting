// Chennai 5x5 pilot — black with blue highlights (max 17 to avoid missing tiles)
const map = new maplibregl.Map({
  container:'map',
  style:{
    version:8,
    sources:{
      dark:{type:'raster', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'], tileSize:256, maxzoom:16, attribution:'ESRI Dark Gray • CMWSSB'},
      ref:{type:'raster', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'], tileSize:256, maxzoom:16},
      esri:{type:'raster', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize:256, maxzoom:19}
    },
    layers:[
      {id:'dark', type:'raster', source:'dark', paint:{'raster-opacity':1}},
      {id:'esri', type:'raster', source:'esri', paint:{'raster-opacity':0.14}},
      {id:'ref', type:'raster', source:'ref', paint:{'raster-opacity':0.9}}
    ]
  },
  center: (typeof CHENNAI_CENTER!=='undefined'? CHENNAI_CENTER : [80.24,13.06]),
  zoom: 14.2, pitch: 60, bearing: 0, maxPitch: 85, minPitch: 0, minZoom: 2, maxZoom: 17,
  antialias:true, dragRotate:true, touchZoomRotate:true, touchPitch:true, renderWorldCopies:true
});
map.addControl(new maplibregl.NavigationControl({showCompass:true, visualizePitch:true}), 'bottom-right');
setInterval(()=>{ const el=document.getElementById('clock'); if(el) el.textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}); },1000);
map.on('load', ()=>{
  const drainFeatures = DRAINAGE_NETWORK.map(d=>({type:'Feature', properties:{id:d.id}, geometry:{type:'LineString', coordinates:d.coords}}));
  map.addSource('drains',{type:'geojson', data:{type:'FeatureCollection', features:drainFeatures}});
  map.addLayer({id:'drains-glow', type:'line', source:'drains', paint:{'line-color':'#38bdf8','line-width':6,'line-opacity':0.18,'line-blur':4}});
  map.addLayer({id:'drains-core', type:'line', source:'drains', paint:{'line-color':'#60a5fa','line-width':1.6,'line-opacity':0.9}});
  // synthetic connectors to make all dots appear linked
  const pts=[...(typeof MANHOLES!=='undefined'?MANHOLES:[]).map(m=>m.coords), ...JUNCTION_NODES.map(j=>j.coords)];
  const drainPts=DRAINAGE_NETWORK.flatMap(d=>d.coords);
  const connectors=[];
  pts.forEach(p=>{
    let best=null, bestD=1e9;
    drainPts.forEach(dp=>{ const d=Math.hypot(p[0]-dp[0], p[1]-dp[1]); if(d<bestD){bestD=d; best=dp;} });
    if(best && bestD<0.003 && bestD>0.00001) connectors.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:[p,best]}});
  });
  map.addSource('connectors',{type:'geojson', data:{type:'FeatureCollection', features:connectors}});
  map.addLayer({id:'connectors', type:'line', source:'connectors', paint:{'line-color':'#38bdf8','line-width':0.9,'line-opacity':0.28,'line-dasharray':[1.5,1.5]}}, 'drains-glow');
  const mhFeatures = (typeof MANHOLES!=='undefined'? MANHOLES:[]).map(m=>({type:'Feature', properties:{id:m.id}, geometry:{type:'Point', coordinates:m.coords}}));
  map.addSource('manholes',{type:'geojson', data:{type:'FeatureCollection', features:mhFeatures}});
  map.addLayer({id:'manholes-glow', type:'circle', source:'manholes', paint:{'circle-radius':6,'circle-color':'#0ea5e9','circle-blur':0.7,'circle-opacity':0.35}});
  map.addLayer({id:'manholes-core', type:'circle', source:'manholes', paint:{'circle-radius':2.8,'circle-color':'#38bdf8','circle-stroke-color':'#e0f2fe','circle-stroke-width':1,'circle-opacity':1}});
  const inletFeatures = JUNCTION_NODES.map(j=>({type:'Feature', properties:{id:j.id}, geometry:{type:'Point', coordinates:j.coords}}));
  map.addSource('inlets',{type:'geojson', data:{type:'FeatureCollection', features:inletFeatures}});
  map.addLayer({id:'inlets-glow', type:'circle', source:'inlets', paint:{'circle-radius':7,'circle-color':'#22d3ee','circle-blur':0.6,'circle-opacity':0.28}});
  map.addLayer({id:'inlets-core', type:'circle', source:'inlets', paint:{'circle-radius':3.2,'circle-color':'#22d3ee','circle-stroke-color':'#ecfeff','circle-stroke-width':1,'circle-opacity':1}});
  ['manholes-core','inlets-core','drains-core'].forEach(l=>{
    map.on('click', l, e=>{ const f=e.features[0]; new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<div style="font:11px JetBrains Mono">${f.properties.id}</div>`).addTo(map); });
    map.on('mouseenter', l, ()=> map.getCanvas().style.cursor='pointer');
    map.on('mouseleave', l, ()=> map.getCanvas().style.cursor='');
  });
});
let isDark=true;
function toggleTheme(){
  isDark=!isDark;
  const b=document.getElementById('darkToggle');
  if(isDark){
    map.setPaintProperty('dark','raster-opacity',1);
    map.setPaintProperty('esri','raster-opacity',0.14);
    map.setPaintProperty('ref','raster-opacity',0.9);
    b.innerHTML='<i class="ph ph-moon"></i> DARK';
    b.className='h-8 px-3 rounded-full bg-sky-500 text-white text-[11px] font-mono font-semibold flex items-center gap-1.5';
  } else {
    map.setPaintProperty('dark','raster-opacity',0);
    map.setPaintProperty('esri','raster-opacity',0.98);
    map.setPaintProperty('ref','raster-opacity',0);
    b.innerHTML='<i class="ph ph-sun"></i> REAL';
    b.className='h-8 px-3 rounded-full bg-white text-zinc-900 text-[11px] font-mono font-semibold flex items-center gap-1.5';
  }
}
window.toggleTheme=toggleTheme;
