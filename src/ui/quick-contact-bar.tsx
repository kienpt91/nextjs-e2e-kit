/** A bar fixed to the bottom of a phone screen with the three fastest ways to reach the studio. Hidden from the tablet size up. */
export function QuickContactBar() {
  return (
    <aside className="quick-contact" aria-label="Quick contact">
      <a href="tel:+15555550100">Call us</a>
      <a href="mailto:hello@example.com">Email us</a>
      <a href="/contact">Send a message</a>
    </aside>
  );
}
