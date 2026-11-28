import {regionOverviewZoom} from './hex-survey.js';

// Ground coordinates stay identical to the rules grid. Pitch compresses only
// their vertical projection; screen positions are always measured in CSS pixels.
export function cameraProject({cx,cy,scale,pitch=1,width,height},x,y) {
  return [(x-cx)*scale+width/2,(y-cy)*scale*pitch+height/2];
}

export function cameraUnproject({cx,cy,scale,pitch=1,width,height},x,y) {
  return [cx+(x-width/2)/scale,cy+(y-height/2)/(scale*pitch)];
}

export function centeredCamera({scale,pitch=1,width,height},x,y,view) {
  return {cx:x+(width/2-view.x)/scale,cy:y+(height/2-view.y)/(scale*pitch)};
}

// Keep the ground beneath the mouse or pinch midpoint fixed while zooming.
export function zoomedCamera(camera,newScale,x=camera.width/2,y=camera.height/2) {
  const [wx,wy]=cameraUnproject(camera,x,y);
  return centeredCamera({...camera,scale:newScale},wx,wy,{x,y});
}

export function pannedCamera({cx,cy,scale,pitch=1},dx,dy) {
  return {cx:cx-dx/scale,cy:cy-dy/(scale*pitch)};
}

export function mapFitZoom(view,extent,base,pitch=1) {
  return regionOverviewZoom(view.width,view.height,extent.width,extent.height*pitch,base);
}
