// Passive decoder for the Ritar battery LINK bus.
//
// The master pack polls the others with Pylontech-style ASCII frames
// (9600 8N1): "~" VER ADR CID1 CID2 LENGTH INFO CHKSUM "\r", all hex
// characters. Replies have CID2 "00"; the analog reply (to request CID2
// "42") carries, per pack: cell voltages, temperatures, current, voltage,
// remaining and total capacity, and cycle count. This file only reads
// frames, it never writes to the bus.
//
// Entities are bound by name: "Pack <n> <field>", see ritar-pack.yaml.
// Protocol notes and measurements: RITAR.md.
#pragma once

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <string>
#include <vector>

namespace ritar {

static constexpr int MAX_PACKS = 3;
static constexpr int CELLS = 16;
static constexpr int TEMPS = 6;
// A pack's entities turn unavailable when it has not been heard for this long.
static constexpr uint32_t STALE_MS = 120000;

struct Pack {
  esphome::sensor::Sensor *current = nullptr;
  esphome::sensor::Sensor *voltage = nullptr;
  esphome::sensor::Sensor *power = nullptr;
  esphome::sensor::Sensor *remaining = nullptr;
  esphome::sensor::Sensor *soc = nullptr;
  esphome::sensor::Sensor *cycles = nullptr;
  esphome::sensor::Sensor *cell_min = nullptr;
  esphome::sensor::Sensor *cell_max = nullptr;
  esphome::sensor::Sensor *cell_delta = nullptr;
  esphome::sensor::Sensor *cells[CELLS] = {};
  esphome::sensor::Sensor *temps[TEMPS] = {};
  uint32_t last_seen = 0;
  bool fresh = false;
};

inline Pack packs[MAX_PACKS + 1];
inline bool bound = false;

inline void bind() {
  if (bound)
    return;
  bound = true;
  for (auto *s : esphome::App.get_sensors()) {
    const std::string name = s->get_name().c_str();
    int n = 0, used = 0;
    if (std::sscanf(name.c_str(), "Pack %d %n", &n, &used) != 1 || n < 1 || n > MAX_PACKS)
      continue;
    Pack &p = packs[n];
    const std::string field = name.substr(used);
    int i = 0;
    if (field == "current") p.current = s;
    else if (field == "voltage") p.voltage = s;
    else if (field == "power") p.power = s;
    else if (field == "remaining capacity") p.remaining = s;
    else if (field == "state of charge") p.soc = s;
    else if (field == "cycles") p.cycles = s;
    else if (field == "cell min") p.cell_min = s;
    else if (field == "cell max") p.cell_max = s;
    else if (field == "cell delta") p.cell_delta = s;
    else if (std::sscanf(field.c_str(), "cell %d", &i) == 1 && i >= 1 && i <= CELLS) p.cells[i - 1] = s;
    else if (std::sscanf(field.c_str(), "temperature %d", &i) == 1 && i >= 1 && i <= TEMPS) p.temps[i - 1] = s;
  }
}

inline int hex_digit(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  return -1;
}

// Parses `chars` hex characters at `pos`; false on any non-hex character.
inline bool hex_value(const std::string &s, size_t pos, size_t chars, uint32_t &out) {
  if (pos + chars > s.size())
    return false;
  out = 0;
  for (size_t i = pos; i < pos + chars; i++) {
    const int d = hex_digit(s[i]);
    if (d < 0)
      return false;
    out = (out << 4) | d;
  }
  return true;
}

inline void publish(esphome::sensor::Sensor *s, float value) {
  if (s != nullptr)
    s->publish_state(value);
}

// Frame without the trailing CR, starting at "~".
inline void handle_frame(const std::string &frame) {
  // ~ VER(2) ADR(2) CID1(2) CID2(2) LENGTH(4) INFO CHKSUM(4)
  if (frame.size() < 18 || frame[0] != '~')
    return;
  const std::string body = frame.substr(1, frame.size() - 5);
  uint32_t checksum = 0, sum = 0;
  if (!hex_value(frame, frame.size() - 4, 4, checksum))
    return;
  for (char c : body)
    sum += static_cast<uint8_t>(c);
  if (((~sum + 1) & 0xFFFF) != checksum)
    return;

  uint32_t adr = 0, cid1 = 0, cid2 = 0, length = 0;
  if (!hex_value(frame, 3, 2, adr) || !hex_value(frame, 5, 2, cid1) || !hex_value(frame, 7, 2, cid2) ||
      !hex_value(frame, 9, 4, length))
    return;
  const size_t info_chars = length & 0x0FFF;
  if (cid1 != 0x46 || cid2 != 0x00 || adr < 1 || adr > MAX_PACKS || 13 + info_chars + 4 != frame.size())
    return;

  std::vector<uint8_t> info(info_chars / 2);
  for (size_t i = 0; i < info.size(); i++) {
    uint32_t b = 0;
    if (!hex_value(frame, 13 + 2 * i, 2, b))
      return;
    info[i] = b;
  }
  auto u16 = [&](size_t at) { return static_cast<uint16_t>(info[at] << 8 | info[at + 1]); };

  // Analog reply: DATAFLAG, pack, M, M x cell mV, K, K x temp (0.1 K),
  // current (10 mA, signed), voltage (10 mV), remaining (10 mAh), user
  // defined (2), total (10 mAh), cycles. Alarm replies are shorter and fail
  // the size check.
  size_t at = 2;
  if (info.size() < 3 || info[1] != adr || info[at] != CELLS)
    return;
  at++;
  if (info.size() < at + 2 * CELLS + 1)
    return;
  uint16_t cells[CELLS];
  for (int i = 0; i < CELLS; i++, at += 2)
    cells[i] = u16(at);
  const uint8_t temp_count = info[at++];
  if (temp_count != TEMPS || info.size() < at + 2 * TEMPS + 11)
    return;
  float temps[TEMPS];
  for (int i = 0; i < TEMPS; i++, at += 2)
    temps[i] = (u16(at) - 2731) / 10.0f;
  const float current = static_cast<int16_t>(u16(at)) / 100.0f;
  const float voltage = u16(at + 2) / 100.0f;
  const float remaining = u16(at + 4) / 100.0f;
  const float total = u16(at + 7) / 100.0f;
  const uint16_t cycles = u16(at + 9);

  uint16_t cell_min = 0xFFFF, cell_max = 0;
  for (uint16_t c : cells) {
    if (c < 2000 || c > 4500)
      return;
    cell_min = std::min(cell_min, c);
    cell_max = std::max(cell_max, c);
  }

  bind();
  Pack &p = packs[adr];
  p.last_seen = esphome::millis();
  p.fresh = true;
  publish(p.current, current);
  publish(p.voltage, voltage);
  publish(p.power, current * voltage);
  publish(p.remaining, remaining);
  publish(p.soc, total > 0 ? remaining / total * 100.0f : NAN);
  publish(p.cycles, cycles);
  publish(p.cell_min, cell_min);
  publish(p.cell_max, cell_max);
  publish(p.cell_delta, cell_max - cell_min);
  for (int i = 0; i < CELLS; i++)
    publish(p.cells[i], cells[i]);
  for (int i = 0; i < TEMPS; i++)
    publish(p.temps[i], temps[i]);
}

inline void handle_bytes(const std::vector<uint8_t> &bytes) {
  std::string s(bytes.begin(), bytes.end());
  const size_t start = s.rfind('~');
  if (start == std::string::npos)
    return;
  s = s.substr(start);
  while (!s.empty() && (s.back() == '\r' || s.back() == '\n'))
    s.pop_back();
  handle_frame(s);
}

// Called periodically: marks packs that went quiet as unavailable.
inline void expire_stale() {
  bind();
  const uint32_t now = esphome::millis();
  for (int n = 1; n <= MAX_PACKS; n++) {
    Pack &p = packs[n];
    if (!p.fresh || now - p.last_seen < STALE_MS)
      continue;
    p.fresh = false;
    for (auto *s : {p.current, p.voltage, p.power, p.remaining, p.soc, p.cycles, p.cell_min, p.cell_max, p.cell_delta})
      publish(s, NAN);
    for (auto *s : p.cells)
      publish(s, NAN);
    for (auto *s : p.temps)
      publish(s, NAN);
  }
}

}  // namespace ritar
