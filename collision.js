export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Resolve one axis at a time so the player cannot pass through a platform between frames.
export function moveAndCollide(player, platforms, dt) {
  const oldX = player.x;
  player.x += player.vx * dt;
  for (const platform of platforms) {
    if (!overlaps(player, platform)) continue;
    if (player.vx > 0 && oldX + player.w <= platform.x + 2) player.x = platform.x - player.w;
    else if (player.vx < 0 && oldX >= platform.x + platform.w - 2) player.x = platform.x + platform.w;
  }
  player.x = Math.max(0, Math.min(960 - player.w, player.x));

  const oldY = player.y;
  player.grounded = false;
  player.y += player.vy * dt;
  for (const platform of platforms) {
    if (!overlaps(player, platform)) continue;
    if (player.vy >= 0 && oldY + player.h <= platform.y + 3) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy < 0 && oldY >= platform.y + platform.h - 3) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
  }
}
