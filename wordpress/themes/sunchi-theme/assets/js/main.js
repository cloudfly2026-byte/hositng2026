/**
 * SUNCHI THEME — CLIENT INTERACTION ENGINE
 * Handles billing cycle switcher, FAQ accordions, and mobile navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. BILLING CYCLE SWITCHER (Monthly / Annual)
  const billingButtons = document.querySelectorAll('.sunchi-billing-btn, .sunchi-billing-toggle');
  const priceValues = document.querySelectorAll('.sunchi-price-val');
  const annualNotes = document.querySelectorAll('.sunchi-annual-note');
  const ctaButtons = document.querySelectorAll('.sunchi-plan-cta');

  if (billingButtons.length > 0) {
    billingButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedCycle = btn.dataset.cycle; // 'MONTHLY' or 'ANNUAL'

        // Switch active button
        billingButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update pricing cards
        priceValues.forEach(el => {
          const monthly = el.dataset.monthly;
          const annual = el.dataset.annual;
          if (selectedCycle === 'ANNUAL' && annual) {
            el.textContent = annual;
          } else if (monthly) {
            el.textContent = monthly;
          }
        });

        // Show/hide annual note
        annualNotes.forEach(note => {
          if (selectedCycle === 'ANNUAL') {
            note.style.display = 'block';
          } else {
            note.style.display = 'none';
          }
        });

        // Update CTA URLs
        ctaButtons.forEach(cta => {
          const planCode = cta.dataset.plan;
          const baseCheckoutUrl = cta.dataset.baseUrl || 'https://app.velupi.com/cart';
          if (planCode) {
            cta.href = `${baseCheckoutUrl}?plan=${encodeURIComponent(planCode)}&cycle=${selectedCycle}`;
          }
        });
      });
    });
  }

  // 2. FAQ ACCORDION INTERACTION
  const faqItems = document.querySelectorAll('.sunchi-faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.sunchi-faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close other FAQs for cleaner UX
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('active');
            const otherBtn = other.querySelector('.sunchi-faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current item
        if (isActive) {
          item.classList.remove('active');
          questionBtn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          questionBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // 3. MOBILE MENU TOGGLE
  const mobileToggle = document.querySelector('.sunchi-mobile-toggle');
  const mobileDrawer = document.querySelector('.sunchi-mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.contains('open');
      if (isOpen) {
        mobileDrawer.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      } else {
        mobileDrawer.classList.add('open');
        mobileToggle.setAttribute('aria-expanded', 'true');
      }
    });
  }
});
