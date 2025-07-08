export function registerDropdown(): void {
  let visibleDropdown: HTMLElement | null = null;

  document.addEventListener('click', (event: MouseEvent) => {
    // Get the clicked element
    const target = event.target as HTMLElement;

    // Find the closest ancestor that is a dropdown trigger
    const trigger = target?.closest('[data-smyth-dropdown-toggle]') as HTMLElement | null;

    // If a trigger was found, show the associated dropdown
    if (trigger) {
      const dropdownId = trigger.getAttribute('data-smyth-dropdown-toggle');
      if (dropdownId) {
        const targetEl = document.getElementById(dropdownId) as HTMLElement | null;
        if (targetEl) {
          show(targetEl);
        }
      }
    }
    // If no trigger was found and a dropdown is visible, hide the dropdown
    else if (visibleDropdown) {
      hide(visibleDropdown);
    }
  });

  function show(targetEl: HTMLElement): void {
    if (visibleDropdown && visibleDropdown !== targetEl) {
      // Hide any currently visible dropdown before showing the new one
      hide(visibleDropdown);
    }

    targetEl?.classList?.remove('hidden');
    visibleDropdown = targetEl;
  }

  function hide(targetEl: HTMLElement): void {
    targetEl?.classList?.add('hidden');
    visibleDropdown = null;
  }
}
