import gsap from 'https://cdn.skypack.dev/gsap';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap/ScrollTrigger';
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis/dist/lenis.mjs';

gsap.registerPlugin(ScrollTrigger);

// --- Lenis Setup ---
const lenis = new Lenis({
  duration: 1.2,
  smoothTouch: true, // Enable for touch/trackpad
  gestureOrientation: 'both', // Allow horizontal gestures to control vertical scroll
});

// Sync Lenis with GSAP's ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

// Sync ScrollTrigger with Lenis
lenis.on('scroll', ScrollTrigger.update);

// --- GSAP Horizontal Scroll ---
const sections = document.querySelectorAll('.panel');
const scrollContainer = document.querySelector('.scroll-container');

// Animate the SECTIONS, not the container
gsap.to(sections, {
  xPercent: -100 * (sections.length - 1),
  ease: 'none', // Linear movement
  scrollTrigger: {
    id: 'horizontalScroll',
    trigger: '.scroll-container', // The container is the trigger
    pin: true, // Pin the trigger element
    scrub: 1,
    // Set the scroll distance based on the container's width
    end: () => "+=" + scrollContainer.offsetWidth*3,
  },
});

// const title = document.getElementById("title-text");

// setTimeout(() => { title.classList.add('opacity-100', 'translate-y-0'); }, 300);

const options = {
  root: document.querySelector(".scroll-container"),
  rootMargin: "0px",
  scrollMargin: "0px",
  threshold: 0.3,
};

const callback = (entries, observer) => {
  entries.forEach((entry) => {
    // Each entry describes an intersection change for one observed
    // target element:
    //   entry.boundingClientRect
    //   entry.intersectionRatio
    //   entry.intersectionRect
    //   entry.isIntersecting
    //   entry.rootBounds
    //   entry.target
    //   entry.time

    if(entry.target === title) {
      setTimeout(() => { title.classList.add('opacity-100', 'translate-y-0'); }, 300);
    }else if(entry.target === bar) {
      setTimeout(() => { entry.target.classList.add('scale-x-100'); }, 300);
    }else if(entry.target === descriptor) {
      setTimeout(() => { descriptor.classList.add('opacity-100', 'translate-y-0'); }, 600);
    }else if(entry.target  === profileImage) {
      setTimeout(() => { profileImage.classList.add('opacity-100', 'scale-100'); }, 50);
    }else if(entry.target.classList.contains("bullet-animate")) {
      setTimeout(() => { entry.target.classList.remove('-rotate-90'); }, 500);
    }else if(entry.target.classList.contains("x-animate")) {
      entry.target.classList.remove('scale-x-100');
      setTimeout(() => { entry.target.classList.add('scale-x-0'); }, 500);
    }else if(entry.target === button_container) {
      setTimeout(() => { entry.target.classList.remove('bg-orange-700'); entry.target.classList.add('the-orange');}, 300);
    }else if(entry.target === button_arrow) {
      setTimeout(() => { entry.target.classList.remove('scale-0', 'opacity-0'); }, 300);
    }else if(entry.target === button_magnify) {
      setTimeout(() => { entry.target.classList.remove('scale-100', 'opacity-100'); entry.target.classList.add('scale-0', 'opacity-0'); }, 300);
    }

  });
};


const observer = new IntersectionObserver(callback, options);

const bar = document.querySelector(".bar");
observer.observe(bar);

const title = document.querySelector("#title-text");
observer.observe(title);

const descriptor = document.querySelector("#descriptor-text");
observer.observe(descriptor);


const profileImage = document.getElementById("profile-image");
observer.observe(profileImage);

const bullets = document.querySelectorAll(".bullet-animate");
for(const bullet of bullets) {
  observer.observe(bullet);
}

const x_borders = document.querySelectorAll(".x-animate");
for(const x_border of x_borders){
  observer.observe(x_border);
}

const button_container = document.querySelector(".button-container");
console.log(button_container);
observer.observe(button_container);

const button_arrow = document.querySelector(".button-arrow");
observer.observe(button_arrow);

const button_magnify = document.querySelector(".button-magnify");
observer.observe(button_magnify);

document.querySelectorAll('.menu-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('id').replace('-link', '');
    const panel = document.getElementById(targetId);
    
    if (panel) {
      // Find the index of the target panel
      const sections = gsap.utils.toArray('.panel');
      const index = sections.indexOf(panel);
      
      if (index !== -1) {
        // More precise calculation based on the ScrollTrigger's total scroll range
        const scrollTrigger = ScrollTrigger.getById('horizontalScroll');
        const totalDistance = scrollTrigger.end - scrollTrigger.start;
        const scrollDistance = index * (totalDistance / (sections.length - 1));
        
        // Use lenis to smooth scroll to that position
        lenis.scrollTo(scrollDistance, { 
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) // Expo.easeOut
        });
      }
    }
  });
});