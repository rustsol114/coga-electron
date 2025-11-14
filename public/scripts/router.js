/**
 * Simple client-side router
 */

(function() {
  'use strict';
  
  const routes = document.querySelectorAll('.route');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // Initialize router
  function init() {
    // Handle initial load
    const hash = window.location.hash || '#home';
    navigate(hash.substring(1));
    
    // Handle hash changes
    window.addEventListener('hashchange', function() {
      const hash = window.location.hash;
      navigate(hash.substring(1));
    });
    
    // Handle nav clicks
    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const route = this.getAttribute('data-route');
        window.location.hash = '#' + route;
      });
    });
  }
  
  // Navigate to a route
  function navigate(routeName) {
    try {
      // Hide all routes
      routes.forEach(function(route) {
        route.classList.remove('active');
      });
      
      // Remove active from all nav links
      navLinks.forEach(function(link) {
        link.classList.remove('active');
      });
      
      // Show target route
      const targetRoute = document.getElementById(routeName + '-route');
      if (targetRoute) {
        targetRoute.classList.add('active');
      }
      
      // Activate corresponding nav link
      const targetLink = document.querySelector('[data-route="' + routeName + '"]');
      if (targetLink) {
        targetLink.classList.add('active');
      }
    } catch (error) {
      console.error('Router navigation error:', error);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

