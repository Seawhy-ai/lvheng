/* Product preference: disable page pinch gestures, not single-finger scrolling. */
(function(){
  ['gesturestart','gesturechange'].forEach(function(type){
    document.addEventListener(type,function(event){event.preventDefault()},{passive:false});
  });
})();
