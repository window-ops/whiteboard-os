document.addEventListener("DOMContentLoaded", function() {
  var bootup = document.getElementById("bootup");
  bootup.style.display = "flex";
  
  setTimeout(function() {
    bootup.style.opacity = "0"; /* fade out the element */
    setTimeout(function() {
      bootup.style.display = "none"; /* set the display property to none after the fade out animation is complete */
    }, 500); /* set the duration of the fade out animation */
  }, 5000); /* Set the duration of the bootup animation */
});