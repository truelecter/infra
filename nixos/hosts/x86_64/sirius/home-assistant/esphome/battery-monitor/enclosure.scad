// DIN rail enclosure for the battery monitor:
// ESP32-C6 Super Mini + HW-0519 RS485 to TTL module, TS35 x 7.5 rail.
//
// Two printed parts:
//   base  - DIN rail sled: plate with the rail clip on the back and the board
//           holders, cable anchors and screw blocks on the front.
//   cover - shell (front plate + four walls) that slides over the base from
//           the front, snaps onto the base side rails along its long walls
//           and is held by two M3 bolts into heat-set inserts.
//
// Coordinates: x along the rail (width), y vertical when mounted (y = 0 is
// the bottom), z from the base back face (rail side, z = 0) towards the front.
// The rail flanges rest on the plate back face; the clip features and the
// back fill reach down to z = -back_t.
//
// Boards are stacked: HW-0519 on the lower level (slides into card guides
// from the top), ESP32-C6 Super Mini on the upper level. ESP insertion: tilt
// the board (USB-C end up), push the far end under the two corner jaws of the
// top groove (it rides over the spring bump and presses it down), push it up
// about 1 mm until the USB-C end clears the corner lips, drop the USB-C end
// onto its ledges and slide the board down onto its stops. The spring beam
// under the far end keeps the board pressed up against the corner jaws; the
// jaws leave the chip antenna uncovered.
//
// Stiffness: continuous solid side frames run along both long plate edges
// across the latch flexure band, the card guides double as full-length side
// rails (bridging over the flexure band), and the cover walls sit tight on
// these rails with a snap bead along their length.
//
// Latch: the stem slides only along y. Its dovetail section (wide at the
// front, 45 deg flanks over matching frame ledges) stops it moving towards
// the rail; the bottom block and a bridge just above the hook stop it moving
// into the box; the bar and arm hang on the deep flexure beams.
//
// 12 V -> 5 V buck converter (optional, `buck`): sits on a shelf that spans
// the card guide tops above the HW-0519, between the ESP top-end block and
// the HW-0519 top end, long axis along the rail. The PCB lies on foam tape in
// a pocket with low locating rims (below the PCB top, clear of the pads), its
// top side (trimmer) faces the front and stays reachable until the cover goes
// on. The 12 V supply cable enters through a third U-slot in the top wall,
// between the LINK-IN and VE.Direct slots, and is tied to its own anchor one
// row above the other two (H grows by 5 mm for that row). Wiring: the supply
// pair runs from its anchor between the LINK-IN and VE.Direct anchors, over
// the HW-0519 top end, to the IN pads; the OUT pads (buck_out_side end) feed
// two wires over the ESP top-end block, along the ESP long edge, to its 5V
// and GND pins at the USB-C end.
//
// Print the base with its back face (clip side) on the bed and the cover with
// its front face on the bed. No supports. PETG or ABS for the base (flexures).

part = "assembly"; // "base" | "cover" | "assembly"
buck = "dsn";      // "dsn" (DSN-mini-360) | "matek" (Matek Micro BEC 6-30V) | "none"

$fn = 64;

/* [Outer size] */
W        = 27.0;  // outer width, along the rail
H        = buck == "none" ? 68.0 : 73.0;  // outer height, vertical when mounted
                                          // (+5 with a converter: supply cable anchor row)
wall     = 2.0;   // cover wall thickness
front_t  = 2.0;   // cover front plate thickness
plate_t  = 2.5;   // base plate thickness
fit      = 0.3;   // gap between base features and the cover walls
side_fit = 0.1;   // gap between the base side rails and the cover long walls

/* [Boards] */
clr        = 0.3;   // clearance around the board edges
esp_l      = 26.2;  // ESP32-C6 Super Mini length (USB-C edge to far edge)
esp_w      = 18.1;  // ESP32-C6 Super Mini width
esp_t      = 1.1;   // ESP PCB thickness
esp_clr    = 0.15;  // top-end groove height above esp_t (groove = esp_t + esp_clr)
esp_usb_h  = 3.2;   // USB-C receptacle height above the ESP PCB
esp_usb_over = 0.6; // USB-C receptacle overhang past the PCB edge
esp_grip   = 1.0;   // top-end corner jaws cover this much of the ESP (no pads there)
esp_lip    = 0.8;   // USB-end corner lips cover this much of the ESP
esp_corner = 2.0;   // corner lip width inside the ESP outline (keep clear of USB-C)
esp_ledge  = 2.0;   // support ledge under the USB-end corners

hw_l       = 42.8;  // HW-0519 length (vertical)
hw_w       = 15.3;  // HW-0519 width
hw_t       = 0.85;  // HW-0519 PCB thickness
hw_comp_h  = 3.0;   // tallest HW-0519 component above its PCB
hw_gap     = 2.0;   // space under the HW-0519 (solder joints, lower guide jaw)
hw_grip    = 0.8;   // card guides cover this much of each long edge
hw_slot_clr = 0.2;  // card guide groove height above hw_t
level_gap  = 3.5;   // space between HW-0519 components and the ESP (wires)

/* [ESP chip antenna keep-out, far end, top face] */
ant_w      = 5.6;   // keep-out width across the board
ant_edge   = 4.7;   // gap from the antenna's right end to the PCB's right edge
                    // (component side facing you, USB-C end down)
ant_d      = 3.0;   // keep-out depth from the far end edge
ant_h      = 1.0;   // keep-out height above the PCB top
ant_clr    = 2.3;   // notch clearance on each side of the antenna (x)

/* [ESP far-end spring] */
esp_spring_t    = 1.0;  // spring beam thickness: the groove floor, bridging the groove
esp_spring_slot = 0.8;  // slot that frees the spring beam from the groove end wall
esp_preload     = 0.25; // spring deflection with the ESP pressed against the jaws
esp_bump_l      = 3.0;  // bump length along the beam (x), at the beam centre
esp_bump_top    = 0.4;  // flat top of the bump (y)

/* [USB-C opening] */
usb_w      = 12.5;  // opening width
usb_h      = 7.0;   // opening height
usb_r      = 1.5;   // corner radius
usb_cz     = 1.6;   // receptacle centre above the ESP PCB top
plug_h     = 6.5;   // USB-C plug overmould height (must clear the bottom block)

/* [Cables] */
link_d     = 6.2;   // LINK-IN patch cord diameter, measure
ve_d       = 4.6;   // VE.Direct cable diameter, measure
cable_clr  = 0.4;   // added to the cable diameter for the cover U-slots
link_x     = 7.3;   // LINK-IN centre x (above the HW-0519 A+/B- end)
ve_x       = 20.3;  // VE.Direct centre x
zt_w       = 3.6;   // zip-tie width
zt_t       = 1.6;   // zip-tie thickness
zt_room    = 2.0;   // zip-tie groove length beside each cable
anchor_bar_h = 1.2; // cable rest bar height above the plate (HW-0519 slides over it)
anchor_gap = 3.0;   // HW-0519 top edge to the cable anchor centre
sup_d      = 4.0;   // 12 V supply cable diameter (round cable or a two-wire pair), measure
sup_x      = 14.2;  // 12 V supply cable centre x, between LINK-IN and VE.Direct
zt_rib     = 0.8;   // plate rib between the anchor row and the supply anchor groove

/* [Buck converter 12 V -> 5 V, PCB long axis along x] */
dsn_l      = 17.5;  // DSN-mini-360 (MP2307) PCB length
dsn_w      = 11.2;  // DSN-mini-360 PCB width
dsn_t      = 1.0;   // DSN-mini-360 PCB thickness
dsn_h      = 4.0;   // tallest DSN-mini-360 component above its PCB (shielded inductor)
dsn_pad    = 2.2;   // corner pad zone from each short end, kept free of rims (1.8 mm pads)
matek_l    = 14.0;  // Matek Micro BEC 6-30V PCB length
matek_w    = 10.0;  // Matek PCB width (the castellated pad edge)
matek_t    = 1.0;   // Matek PCB thickness
matek_h    = 3.0;   // tallest Matek component above its PCB
matek_pad  = 1.5;   // castellated pad zone at the pad end, kept free of rims
buck_out_side = -1; // -1: OUT pads at the left end (x-, ESP 5V/GND side), +1: right
buck_clr   = 0.3;   // clearance around the PCB in the pocket
buck_rim   = 1.2;   // locating rim width
buck_rim_up = 0.8;  // rim height above the PCB underside (< PCB thickness, pads stay free)
buck_tab_w = 2.0;   // DSN end stop tab width, between the two corner pads
buck_tape  = 1.0;   // double-sided foam tape under the PCB
buck_shelf_t = 1.5; // shelf thickness
buck_hw_gap = 0.5;  // shelf underside above the HW-0519 components
buck_esp_gap = 0.8; // ESP top-end block to the shelf (y)
buck_wire  = 1.5;   // wire room above the converter, under the cover

/* [Fasteners: M3 bolts into heat-set inserts] */
bolt_d     = 3.4;   // M3 clearance hole
ins_d      = 4.4;   // heat-set insert hole diameter (M3 x 5 x 4 insert)
ins_depth  = 6.0;   // heat-set insert hole depth (insert is 4 long, bolt tip room)
ins_wall   = 1.6;   // minimum wall around the insert hole
top_blk_d  = 6.5;   // top screw beam depth (y)
top_leg    = 1.4;   // top screw beam leg width (x), legs sit beside the cables
bot_blk_d  = 7.2;   // bottom screw block depth (y)
stem_gap   = 0.3;   // gap above the latch stem under the bottom block and the stem bridge

/* [DIN rail TS35 x 7.5, clip on the base back] */
rail_w      = 35.0;  // rail width
rail_h      = 7.5;   // rail depth
flange_t    = 1.0;   // rail flange thickness
flange_w    = 5.0;   // rail flange width including the web
din_clr     = 0.3;   // clearance behind and beside the flanges
back_t      = 3.1;   // hook height behind the plate, also the back fill depth
hook_over   = 1.8;   // hook overlap over the flange
hook_margin = 1.0;   // top hook inset from the side edges
chan_clr    = 0.5;   // back fill clearance to the rail webs

stem_w      = 7.4;   // latch stem width at the front face (dovetail: narrower at the back)
slot        = 0.8;   // slot width around the latch parts
dt_w        = 1.6;   // stem dovetail: 45 deg flank width (x) on each side, inside the plate
dt_clr      = 0.35;  // dovetail clearance, normal to the flanks
tab_out     = 4.0;   // screwdriver tab length below the base
tab_hole_w  = 3.0;   // screwdriver hole in the tab (x), within the narrow back of the stem
tab_hole_h  = 1.6;   // screwdriver hole in the tab (y)
stem_bridge_d = 3.0; // fixed bridge over the stem above the hook (y length)
stem_bridge_t = 1.0; // bridge thickness
stem_bridge_leg = 1.5; // bridge leg width (x) on the fixed frame
beam_t      = 0.9;   // flexure beam thickness (y)
beam_gap    = 1.2;   // gap between the two parallel flexure beams
bar_h       = 2.0;   // latch bar height (y), joins stem and beam ends
arm_w       = 1.5;   // latch arm width (x), joins bar and beam ends
latch_travel  = 2.1; // hook travel needed to clear the flange
travel_margin = 0.6; // extra room beyond latch_travel
frame_w     = 3.0;   // solid side frame width along both long plate edges
band_gap    = 0.5;   // card guides bridge over the latch band this far above the plate

/* [Cover snap onto the base side rails] */
snap_h      = 0.4;   // bead on the cover long walls, height from the wall face
snap_z      = 1.5;   // bead centre above the plate front face
snap_clr    = 0.1;   // bead to groove clearance (groove in the side rails)

/* [Edges] */
corner_r   = 2.5;  // outer vertical edge radius, base and cover (> wall)
bed_ch     = 0.5;  // chamfer on the outer bed edges (base back, cover front)
in_ch      = 0.5;  // 45 deg fillet inside the cover along the front plate (< 2 x fit)
gusset     = 1.0;  // 45 deg gussets where base features meet the plate or a beam
top_ch     = 0.5;  // chamfer on the top edges of card guides and cable bars
lead_in    = 0.5;  // lead-in chamfer on grooves, insert holes and bolt holes
usb_bridge = 6.0;  // flat edge left on the base side of the USB-C opening (short bridge)

// ---------------------------------------------------------------------------
// Derived values

cx   = W / 2;
fx0  = wall + fit;            // base features stay inside the cover walls
fx1  = W - wall - fit;
rx0  = wall + side_fit;       // side rails (card guide outer walls) touch the cover walls
rx1  = W - rx0;
iy0  = wall;
iy1  = H - wall;

// boards, z
hw_z     = plate_t + hw_gap;
hw_top_z = hw_z + hw_t + hw_comp_h;
esp_z    = hw_top_z + level_gap;
usb_z    = esp_z + esp_t + usb_cz;

// boards, x
esp_px0  = cx - esp_w / 2 - clr;
esp_px1  = cx + esp_w / 2 + clr;
ant_off  = esp_w / 2 - ant_edge - ant_w / 2;  // antenna centre from the board centreline (+ = right)
ant_x0   = cx + ant_off - ant_w / 2 - ant_clr;  // antenna notch in the top-end jaws
ant_x1   = cx + ant_off + ant_w / 2 + ant_clr;
hw_gx    = cx - hw_w / 2 - clr;           // left card guide groove bottom (x)

// boards, y
y_stop   = iy0 + fit + 1.6;           // ESP USB-end stop face
esp_y0   = y_stop + 0.15;             // ESP bottom edge
esp_y1   = esp_y0 + esp_l;            // ESP top edge
esp_over = esp_lip + 0.2;             // extra groove depth for tilting the ESP in
bb_y0    = iy0 + fit;                 // bottom block
bb_y1    = bb_y0 + bot_blk_d;
hw_y0    = bb_y1 + 1.0;               // HW-0519 bottom edge (1 mm stop below)
hw_y1    = hw_y0 + hw_l + clr;

// ESP holders, z
z_blk    = esp_z - 1.0;               // bottom block top
lip_z0   = esp_z + esp_t + 0.15;
lip_z1   = lip_z0 + 1.0;

// ESP top-end block: corner jaws over a spring beam (the groove floor)
etb_y0   = esp_y1 - esp_grip;          // jaw tips
etb_ge   = esp_y1 + esp_clr + esp_over; // groove end, room to push the ESP up while tilting it in
etb_y1   = etb_ge + esp_spring_slot + 1.5; // end wall
etb_gz   = esp_z + esp_t + esp_clr;   // jaw underside
etb_z0   = esp_z - esp_spring_t;      // spring beam underside
etb_z1   = etb_gz + 1.2;
bump_h   = esp_clr + esp_preload;     // bump height above the groove floor
bump_y1  = etb_y0 + 2 * bump_h + esp_bump_top;

// card guides, z
hw_gz1   = hw_z + hw_t + hw_slot_clr; // groove top
hw_gt    = hw_gz1 + 1.2;              // guide top
hw_gi    = cx - hw_w / 2 + hw_grip;   // left card guide inner face (x)

// cable anchors and the top screw beam
ay       = hw_y1 + anchor_gap;
bk       = buck != "none";
ay2      = ay + zt_w + 0.4 + zt_rib;  // 12 V supply cable anchor, one row above
sup_room = zt_t + 0.2;               // supply anchor groove beside the cable (tight between cables)
cable_z  = plate_t + anchor_bar_h;    // cable underside
tb_y1    = iy1 - fit;
tb_y0    = tb_y1 - top_blk_d;
tb_z0    = cable_z + max(link_d, ve_d, bk ? sup_d : 0) + 0.4;
tb_z1    = tb_z0 + ins_d + 2 * ins_wall;
tb_bz    = (tb_z0 + tb_z1) / 2;       // top bolt axis

// cover
z_ci     = max(esp_z + esp_t + esp_usb_h + 1.0, usb_z + usb_h / 2 + 0.3, tb_z1 + fit,
               esp_z + esp_clr + esp_t + ant_h + 0.5);
z_co     = z_ci + front_t;

// buck converter: shelf over the HW-0519 on posts standing on the card
// guide tops; PCB centred on the shelf, long axis along x
bk_m     = buck == "matek";
bk_l     = bk_m ? matek_l : dsn_l;
bk_w     = bk_m ? matek_w : dsn_w;
bk_t     = bk_m ? matek_t : dsn_t;
bk_h     = bk_m ? matek_h : dsn_h;
bk_pad   = bk_m ? matek_pad : dsn_pad;
bs_x0    = rx0 + top_ch;              // shelf and posts, x (post foot on the flat guide top)
bs_x1    = W - bs_x0;
bs_y0    = etb_y1 + buck_esp_gap;
bs_y1    = bs_y0 + bk_w + 2 * (buck_clr + buck_rim);
bs_z0    = hw_top_z + buck_hw_gap;
bs_z1    = bs_z0 + buck_shelf_t;
bk_x0    = cx - bk_l / 2;             // PCB outline
bk_x1    = cx + bk_l / 2;
bk_y0    = (bs_y0 + bs_y1 - bk_w) / 2;
bk_y1    = bk_y0 + bk_w;
bk_cy    = (bk_y0 + bk_y1) / 2;
bk_z     = bs_z1 + buck_tape;         // PCB underside
bk_rz    = bk_z + buck_rim_up;        // rim top
bk_top   = bk_z + bk_t + bk_h;

// bottom bolt
bb_x     = fx1 - ins_d / 2 - ins_wall;
bb_z     = (plate_t + z_blk) / 2;

// rail and clip
rail_cy  = H / 2;
rail_top = rail_cy + rail_w / 2;
rail_bot = rail_cy - rail_w / 2;
chan_y0  = rail_bot + flange_w + chan_clr;   // back fill between the webs
chan_y1  = rail_top - flange_w - chan_clr;
stem_x0  = cx - stem_w / 2;
stem_x1  = cx + stem_w / 2;
stem_fill_y0 = rail_bot + flange_w + latch_travel + 0.4; // stem fill clears the web when pulled
dt_z0    = (plate_t - dt_w) / 2;     // stem dovetail flank bottom
dt_g     = dt_clr * sqrt(2);         // dovetail clearance, horizontal and vertical
stem_bridge_y = rail_bot + hook_over + 0.5; // stem bridge, just above the hook

// latch flexure band, at the top of the rail channel:
// stem -> bar -> arm -> two parallel beams anchored in the left side frame;
// the arm moves in a slot inside the right side frame. Both frames run
// unbroken along the long plate edges.
band_top = chan_y1 - 1.5;
b2_y1    = band_top - slot;
b2_y0    = b2_y1 - beam_t;
b1_y1    = b2_y0 - beam_gap;
b1_y0    = b1_y1 - beam_t;
bar_y1   = b1_y0 - slot;
bar_y0   = bar_y1 - bar_h;
bar_gap  = latch_travel + travel_margin + 0.2;
anchor_x = frame_w;
arm_x1   = W - frame_w - slot;
arm_x0   = arm_x1 - arm_w;
beam_l   = arm_x0 - anchor_x;
frame_r_top = bar_y0 - bar_gap;              // right frame top edge under the bar
// fixed-guided beam: peak bending strain at full travel
beam_strain = 3 * beam_t * (latch_travel + travel_margin) / (beam_l * beam_l);

// span of the latch band; the card guides bridge over it
band_y0  = frame_r_top - 0.3;
band_y1  = band_top + 0.3;

// cover snap bead along the side rails
snap_zc  = plate_t + snap_z;
snap_d   = snap_h - side_fit + snap_clr; // groove depth into the rails
snap_y0  = hw_y0;
snap_y1  = hw_y1 - 1.0;

assert(fx0 <= esp_px0 - 1.2 && esp_px1 + 1.2 <= fx1, "ESP does not fit the width, increase W");
assert(etb_y1 < band_y0, "ESP top groove block runs into the latch band");
assert(ant_x0 - (cx - esp_w / 2) >= 1.0 && (cx + esp_w / 2) - ant_x1 >= 1.0,
       "antenna keep-out leaves less than 1 mm of corner jaw on the board");
assert(ant_d > esp_grip, "antenna keep-out shorter than the jaw grip");
assert(etb_y0 + bump_h + esp_bump_top < esp_y1 - 0.1, "spring bump top does not sit under the ESP end");
assert(esp_bump_l < esp_px1 - esp_px0 - 4, "spring bump longer than the spring beam");
assert(beam_strain < 0.03, "latch beams overstrained, increase W or reduce beam_t/frame_w");
assert(frame_w > rx0 + snap_d + 0.3, "snap groove would cut the side rails off the side frames");
assert(snap_zc - snap_d > plate_t + 0.2 && snap_zc + snap_d < hw_gt - top_ch - 0.2,
       "snap groove does not fit the side rail height");
assert(snap_h > side_fit + 0.1, "snap bead does not engage");
assert(hw_gx - rx0 >= 1.2, "card guide wall too thin");
assert(cx - usb_w / 2 > esp_px0 + esp_corner, "USB-C opening hits the ESP corner lips");
assert(usb_z - plug_h / 2 >= z_blk + 0.2, "USB-C plug hits the bottom block, increase level_gap");
assert(bb_x - ins_d / 2 >= stem_x1 + slot + 0.5, "bottom insert sits over the latch stem");
assert(slot > dt_g + 0.2, "slot too narrow for the dovetail clearance");
assert(dt_w > slot + 0.4, "dovetail engagement too small, increase dt_w");
assert(dt_z0 >= 0.3 && dt_z0 + dt_w + slot - dt_g <= plate_t - 0.1, "dovetail does not fit the plate");
assert(tab_hole_w <= stem_w - 2 * dt_w - 1.0, "tab hole wider than the narrow back of the stem");
assert(frame_r_top - bar_gap > stem_bridge_y + stem_bridge_d + 2, "stem dovetail too short");
assert(plate_t + stem_gap + stem_bridge_t <= hw_z - 0.5, "stem bridge too close to the HW-0519");
assert(bb_z - ins_d / 2 - ins_wall >= plate_t - 0.01 && bb_z + ins_d / 2 + ins_wall <= z_blk + 0.01,
       "bottom insert walls too thin, increase level_gap or hw_gap");
assert(bb_y0 + ins_depth <= bb_y1, "bottom block too short for the insert");
assert(ins_depth <= top_blk_d, "top beam too short for the insert");
assert(fx0 + top_leg < link_x - (link_d + cable_clr) / 2, "top beam leg hits the LINK-IN cable");
assert(fx1 - top_leg > ve_x + (ve_d + cable_clr) / 2, "top beam leg hits the VE.Direct cable");
assert(ay + zt_w / 2 + 0.2 < tb_y0 - 0.2, "cable anchor grooves run into the top beam legs");
assert(hw_y1 < ay - zt_w / 2 - 1.0, "HW-0519 runs into the cable anchors");
assert(stem_fill_y0 < bar_y0 - 1, "latch band too low");
assert(cable_z < hw_z - 0.2, "HW-0519 cannot slide over the cable anchors");
assert(corner_r > wall, "corner_r must exceed the cover wall");
assert(in_ch < 2 * fit, "in_ch would touch the base features at the cover front");
assert(usb_bridge < usb_w - 2 * usb_r, "usb_bridge wider than the USB-C opening");

// buck converter and its supply cable entry
assert(buck == "none" || buck == "dsn" || buck == "matek", "buck must be \"dsn\", \"matek\" or \"none\"");
assert(!bk || bk_x0 - buck_clr - buck_rim >= bs_x0, "converter pocket wider than the shelf, increase W");
assert(!bk || bs_y1 <= hw_y1 - 4.0, "converter shelf covers the HW-0519 top-end pads");
assert(!bk || bs_y1 < ay - zt_w / 2 - 1.0, "converter shelf runs into the cable anchors");
assert(!bk || bs_y0 >= etb_y1 + 0.5, "converter shelf runs into the ESP top-end block");
assert(!bk || bs_z0 >= hw_top_z + 0.3, "converter shelf too close to the HW-0519 components");
assert(!bk || bk_top + buck_wire <= z_ci, "no wire room between the converter and the cover");
assert(!bk || (buck_rim_up < bk_t && buck_rim_up >= 0.3), "rims must stay below the converter PCB top");
assert(!bk || bk_l - (bk_m ? 1 : 2) * bk_pad >= 3.0, "pad zones leave no room for the long-edge rims");
assert(!bk || buck_tab_w <= bk_w - 5.0, "DSN end tabs too wide for the gap between the corner pads");
assert(!bk || (sup_x - (sup_d + cable_clr) / 2) - (link_x + (link_d + cable_clr) / 2) >= 1.0,
       "supply U-slot too close to the LINK-IN slot");
assert(!bk || (ve_x - (ve_d + cable_clr) / 2) - (sup_x + (sup_d + cable_clr) / 2) >= 1.0,
       "supply U-slot too close to the VE.Direct slot");
assert(!bk || (sup_x - sup_d / 2 - zt_t >= link_x + link_d / 2 && sup_x + sup_d / 2 + zt_t <= ve_x - ve_d / 2),
       "supply zip tie does not fit between the LINK-IN and VE.Direct cables");
assert(!bk || ay2 + zt_w / 2 + 0.2 < tb_y0 - 0.2, "supply anchor groove runs into the top beam, increase H");
assert(!bk || cable_z + sup_d + cable_clr / 2 < tb_bz - bolt_d / 2 - 1.0, "supply U-slot runs into the top bolt hole");

// ---------------------------------------------------------------------------
// Helpers

module box(p0, p1) { translate(p0) cube([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]); }

// Extrude a (y, z) profile along x from x0 to x0 + w.
module yz_profile(x0, w, pts) {
    translate([x0, 0, 0]) rotate([90, 0, 90]) linear_extrude(w) polygon(pts);
}

// Cylinder along +y starting at y0.
module cyl_y(x, y0, z, d, len) {
    translate([x, y0, z]) rotate([-90, 0, 0]) cylinder(d = d, h = len);
}

// Extrude an (x, z) profile along y from y0 to y1.
module xz_profile(y0, y1, pts) {
    translate([0, y1, 0]) rotate([90, 0, 0]) linear_extrude(y1 - y0) polygon(pts);
}

// Outer outline of base and cover with rounded vertical edges, inset by `inset`.
module outline2d(inset = 0) {
    offset(r = corner_r - inset) offset(delta = -corner_r) square([W, H]);
}

module outline_slab(z0, z1, inset = 0) {
    translate([0, 0, z0]) linear_extrude(z1 - z0) outline2d(inset);
}

// Teardrop in 2D pointing +y, tip cut flat at 1.15 r.
module teardrop2d(r) {
    intersection() {
        hull() { circle(r = r); rotate(45) square(r); }
        translate([-r - 1, -r - 1]) square([2 * r + 2, 2.15 * r + 1]);
    }
}

// Lead-in cone on a hole along y; dir = +1 if the hole runs +y from y_face.
module lead_in_y(x, y_face, z, d, dir) {
    translate([x, y_face - dir * 0.01, z]) rotate([dir > 0 ? -90 : 90, 0, 0])
        cylinder(d1 = d + 2 * lead_in, d2 = d, h = lead_in + 0.01);
}

// 45 deg gusset along y: right angle at (x, z), legs `g` towards dx and dz.
module gusset_y(y0, y1, x, z, dx, dz, g = gusset) {
    xz_profile(y0, y1, [[x, z], [x + dx * g, z], [x, z + dz * g]]);
}

// Lower edge of the slot under the lower beam: follows the fixed-guided beam
// deflection so the frame never stops the beam before the hook clears.
function under_slot(s) = slot + (latch_travel + travel_margin) * (3 * s * s - 2 * s * s * s);

// ---------------------------------------------------------------------------
// Base: plate, back fill and DIN clip

module base_envelope() {
    // rounded vertical edges, chamfered bed edge on the back
    hull() {
        outline_slab(-back_t, -back_t + 0.01, bed_ch);
        outline_slab(-back_t + bed_ch, plate_t, 0);
    }
}

module base_body() {
    intersection() {
        union() {
            box([0, 0, 0], [W, H, plate_t]);
            // back fill: the plate back is flat except where the rail sits, so
            // the base prints on its back without supports
            difference() {
                union() {
                    box([0, 0, -back_t], [W, rail_bot - din_clr, 0.01]);
                    box([0, chan_y0, -back_t], [W, chan_y1, 0.01]);
                    box([0, rail_top + din_clr, -back_t], [W, H, 0.01]);
                }
                box([stem_x0 - slot, chan_y0 - 1, -back_t - 1], [stem_x1 + slot, stem_fill_y0, 0]);
            }
        }
        base_envelope();
    }
    // screwdriver tab, same dovetail section as the stem
    xz_profile(-tab_out, 0.01, stem_section());
}

module top_hook_lip() {
    yz_profile(hook_margin, W - 2 * hook_margin, [
        [rail_top - hook_over, -back_t], [rail_top + din_clr + 0.01, -back_t],
        [rail_top + din_clr + 0.01, -(flange_t + din_clr)],
        [rail_top - hook_over, -(flange_t + din_clr)]]);
}

module latch_hook_lip() {
    yb = rail_bot;
    lead = back_t - 1.7;  // 45 deg lead-in, the rail flange pushes the hook down
    yz_profile(stem_x0 + dt_w, stem_w - 2 * dt_w, [
        [yb - din_clr - 0.01, -(flange_t + din_clr)], [yb + hook_over, -(flange_t + din_clr)],
        [yb + hook_over, -1.7], [yb + hook_over - lead, -back_t],
        [yb - din_clr - 0.01, -back_t]]);
}

// Latch stem cross-section (x, z): dovetail, full stem_w at the front, 45 deg
// flanks inside the plate, narrow at the back.
function stem_section() = [
    [stem_x0 + dt_w, -back_t], [stem_x1 - dt_w, -back_t], [stem_x1 - dt_w, dt_z0],
    [stem_x1, dt_z0 + dt_w], [stem_x1, plate_t], [stem_x0, plate_t],
    [stem_x0, dt_z0 + dt_w], [stem_x0 + dt_w, dt_z0]];

// Left stem edge (x, z), top to bottom, through the plate and beyond.
function stem_edge_l(zb, zt) = [
    [stem_x0, zt], [stem_x0, dt_z0 + dt_w], [stem_x0 + dt_w, dt_z0], [stem_x0 + dt_w, zb]];

// Left dovetail slot (x, z): the fixed frame follows the stem edge, `slot`
// apart on the vertical faces and dt_clr apart (normal) on the flanks. The
// frame ledge under the stem flank faces up, the stem flank overhangs at 45 deg.
function stem_slot_l(zb, zt) = concat([
    [stem_x0 + dt_w - slot, zb], [stem_x0 + dt_w - slot, dt_z0 + slot - dt_g],
    [stem_x0 - slot, dt_z0 + dt_w + slot - dt_g], [stem_x0 - slot, zt]],
    stem_edge_l(zb, zt));

// Region from the left stem edge out to x = xf (xf < stem_x0).
function beside_stem_l(xf, zb, zt) = concat([[xf, zb], [xf, zt]], stem_edge_l(zb, zt));

module latch_cuts() {
    z0 = -back_t - 1;
    z1 = plate_t + 1;
    module thru(x0, y0, x1, y1) box([x0, y0, z0], [x1, y1, z1]);
    // dovetail slots on both stem sides, from the tab up to the latch band
    for (side = [-1, 1]) mirror_cx(side) xz_profile(-tab_out - 1, frame_r_top, stem_slot_l(z0, z1));
    // left: the frame ledge ends bar_gap below the band so the stem can be
    // pulled down; above, a plain slot up to the lower beam
    xz_profile(frame_r_top - bar_gap, frame_r_top + 0.01, beside_stem_l(stem_x0 - slot, z0, z1));
    thru(stem_x0 - slot, frame_r_top, stem_x0, b1_y0);
    // right: travel gap under the bar and beside the arm
    mirror_cx(1) xz_profile(frame_r_top - 0.01, bar_y0, beside_stem_l(2 * cx - arm_x1 - slot, z0, z1));
    thru(arm_x1, frame_r_top, arm_x1 + slot, band_top);
    // between the bar and the lower beam
    thru(stem_x0 - slot, bar_y1, arm_x0, b1_y0);
    // under the lower beam over the left frame, following the beam bend
    n = 16;
    translate([0, 0, z0]) linear_extrude(z1 - z0)
        polygon(concat([[anchor_x, b1_y0], [stem_x0, b1_y0]],
            [for (i = [n:-1:0]) let(x = anchor_x + (stem_x0 - anchor_x) * i / n)
                [x, b1_y0 - under_slot((x - anchor_x) / beam_l)]]));
    // between the beams and above the upper beam
    thru(anchor_x, b1_y1, arm_x0, b2_y0);
    thru(anchor_x, b2_y1, arm_x1 + slot, band_top);
    // screwdriver hole in the tab
    box([cx - tab_hole_w / 2, -tab_out + 0.8, z0], [cx + tab_hole_w / 2, -tab_out + 0.8 + tab_hole_h, z1]);
}

// ---------------------------------------------------------------------------
// Base: front features

// Mirror about the centre line for side = +1.
module mirror_cx(side) {
    if (side < 0) children();
    else translate([2 * cx, 0, 0]) mirror([1, 0, 0]) children();
}

// Card guides, also the side rails: the outer wall reaches out to the cover
// wall (side_fit) and carries the snap groove. Continuous over the full
// HW-0519 length; across the latch band the part over the moving latch
// stands band_gap above the plate (a short bridge), the part over the side
// frame stays on the plate.
module hw_guides() {
    p   = plate_t - 0.01;
    gz0 = hw_z;
    o   = rx0;                          // left guide; the right one is mirrored
    g   = hw_gx;
    i   = hw_gi;
    y0  = hw_y0 - 1.0;
    for (side = [-1, 1]) mirror_cx(side) {
        difference() {
            // guide with an inner foot gusset and a chamfered top edge
            xz_profile(y0, hw_y1, [
                [o, p], [i + gusset, p], [i, p + gusset], [i, gz0], [g, gz0],
                [g, hw_gz1], [i, hw_gz1], [i, hw_gt], [o + top_ch, hw_gt], [o, hw_gt - top_ch]]);
            // lead-in at the upper end, where the board slides in
            hull() {
                box([g, hw_y1 - 2 * lead_in, gz0], [i + 1, hw_y1 - 2 * lead_in + 0.01, hw_gz1]);
                box([g, hw_y1, gz0 - lead_in], [i + 1, hw_y1 + 0.01, hw_gz1 + lead_in]);
            }
        }
        // stop at the lower end
        box([g - 0.01, y0, gz0 - 0.01], [i, hw_y0, hw_gz1 + 0.01]);
    }
}

// Clearance under the card guides over the moving latch parts.
module band_relief() {
    box([frame_w, band_y0, plate_t - 1], [W - frame_w, band_y1, plate_t + band_gap]);
}

// V-groove in the side rails for the cover snap bead (45 deg roof).
module snap_grooves() {
    for (side = [-1, 1]) mirror_cx(side)
        xz_profile(snap_y0 - 0.5, snap_y1 + 0.5, [
            [rx0 - 0.5, snap_zc - snap_d - 0.5], [rx0 + snap_d, snap_zc],
            [rx0 - 0.5, snap_zc + snap_d + 0.5]]);
}

// Front stop over the latch stem, just above the hook: legs on the fixed
// frame, stem_gap above the stem.
module stem_bridge() {
    xl = stem_x0 - slot;
    xr = stem_x1 + slot;
    y0 = stem_bridge_y;
    y1 = y0 + stem_bridge_d;
    z0 = plate_t + stem_gap;
    box([xl - stem_bridge_leg, y0, z0], [xr + stem_bridge_leg, y1, z0 + stem_bridge_t]);
    box([xl - stem_bridge_leg, y0, plate_t - 0.01], [xl, y1, z0 + 0.01]);
    box([xr, y0, plate_t - 0.01], [xr + stem_bridge_leg, y1, z0 + 0.01]);
}

module bottom_block() {
    // carries the ESP USB-end corner lips and the bottom insert, bridges over
    // the latch stem
    sx0 = stem_x0 - slot - 0.5;
    sx1 = stem_x1 + slot + 0.5;
    difference() {
        union() {
            box([fx0, bb_y0, plate_t - 0.01], [fx1, bb_y1, z_blk]);
            // foot gussets towards the HW-0519, on the fixed frame only
            for (xr = [[fx0, sx0], [sx1, fx1]])
                yz_profile(xr[0], xr[1] - xr[0], [
                    [bb_y1 - 0.01, plate_t - 0.01], [bb_y1 + gusset, plate_t - 0.01],
                    [bb_y1 - 0.01, plate_t + gusset]]);
        }
        box([sx0, bb_y0 - 1, plate_t - 1], [sx1, bb_y1 + gusset + 1, plate_t + stem_gap]);
        cyl_y(bb_x, bb_y0 - 0.01, bb_z, ins_d, ins_depth);
        lead_in_y(bb_x, bb_y0, bb_z, ins_d, 1);
    }
    for (side = [0, 1]) {
        x0 = side == 0 ? fx0 : esp_px1 - esp_corner;
        x1 = side == 0 ? esp_px0 + esp_corner : fx1;
        box([x0, bb_y0, z_blk - 0.01], [x1, y_stop, lip_z1]);                    // post
        box([x0, y_stop - 0.01, z_blk - 0.01], [x1, esp_y0 + esp_ledge, esp_z]); // ledge
        box([x0, y_stop - 0.01, lip_z0], [x1, esp_y0 + esp_lip, lip_z1]);        // lip
    }
}

// Top-end holder: groove with two corner jaws over the board corners (none
// over the chip antenna) and a spring beam as the groove floor. The beam
// bridges across the groove between the legs, freed from the end wall by a
// slot; its centre bump presses the board up against the jaws.
module esp_top_block() {
    y0 = etb_y0;
    y1 = etb_y1;
    difference() {
        union() {
            box([fx0, y0, etb_z0], [fx1, y1, etb_z1]);
            box([fx0, y0, plate_t - 0.01], [esp_px0, y1, etb_z0 + 0.01]);
            box([esp_px1, y0, plate_t - 0.01], [fx1, y1, etb_z0 + 0.01]);
            // gussets under the bridge, clear of the HW-0519 below
            gusset_y(y0, y1, esp_px0 - 0.01, etb_z0 + 0.01, 1, -1);
            gusset_y(y0, y1, esp_px1 + 0.01, etb_z0 + 0.01, -1, -1);
        }
        box([esp_px0, y0 - 1, esp_z], [esp_px1, etb_ge, etb_gz]);
        // lead-in at the groove opening
        hull() {
            box([esp_px0, y0 + lead_in, esp_z], [esp_px1, y0 + lead_in + 0.01, etb_gz]);
            box([esp_px0, y0 - 0.01, esp_z - lead_in], [esp_px1, y0, etb_gz + lead_in]);
        }
        // slot between the spring beam and the end wall
        box([esp_px0, etb_ge - 0.01, etb_z0 - 1.1], [esp_px1, etb_ge + esp_spring_slot, esp_z + 0.01]);
        // antenna keep-out: open notch through the jaws
        box([ant_x0, y0 - 1, etb_gz - 0.01], [ant_x1, etb_ge, etb_z1 + 1]);
    }
    // spring bump, 45 deg ramps both ways; fills the floor lead-in under it
    h = bump_h;
    yz_profile(cx - esp_bump_l / 2, esp_bump_l, [
        [y0, esp_z - lead_in - 0.01], [y0, esp_z], [y0 + h, esp_z + h],
        [y0 + h + esp_bump_top, esp_z + h], [bump_y1, esp_z], [bump_y1, esp_z - lead_in - 0.01]]);
}

// zip-tie anchor: groove in the plate under the cable, bridged by a bar the
// cable rests on
module anchor_groove(x, d, y = ay, room = zt_room) {
    box([max(fx0, x - d / 2 - room), y - zt_w / 2 - 0.2, plate_t - zt_t - 0.2],
        [min(fx1, x + d / 2 + room), y + zt_w / 2 + 0.2, plate_t + 1]);
}

module anchor_bar(x, d, y = ay) {
    x0 = x - (d - 1) / 2;
    x1 = x + (d - 1) / 2;
    t  = plate_t + anchor_bar_h;
    c  = min(top_ch, anchor_bar_h / 2);  // rounded-off edges for the cable and zip tie
    xz_profile(y - zt_w / 2 - 1.2, y + zt_w / 2 + 1.2, [
        [x0, plate_t - 0.01], [x1, plate_t - 0.01], [x1, t - c], [x1 - c, t], [x0 + c, t], [x0, t - c]]);
}

module top_beam() {
    // spans over the cables, insert pressed in from the top face
    xl = fx0 + top_leg;
    xr = fx1 - top_leg;
    difference() {
        union() {
            box([fx0, tb_y0, tb_z0], [fx1, tb_y1, tb_z1]);
            box([fx0, tb_y0, plate_t - 0.01], [xl, tb_y1, tb_z0 + 0.01]);
            box([xr, tb_y0, plate_t - 0.01], [fx1, tb_y1, tb_z0 + 0.01]);
            // gussets at the leg feet and under the beam, clear of the cables
            gusset_y(tb_y0, tb_y1, xl - 0.01, plate_t - 0.01, 1, 1);
            gusset_y(tb_y0, tb_y1, xr + 0.01, plate_t - 0.01, -1, 1);
            gusset_y(tb_y0, tb_y1, xl - 0.01, tb_z0 + 0.01, 1, -1);
            gusset_y(tb_y0, tb_y1, xr + 0.01, tb_z0 + 0.01, -1, -1);
        }
        cyl_y(cx, tb_y1 - ins_depth, tb_bz, ins_d, ins_depth + 0.01);
        lead_in_y(cx, tb_y1, tb_bz, ins_d, -1);
    }
}

// Buck converter shelf: a plate bridging over the HW-0519 on two posts that
// stand on the card guide tops (the HW-0519 still slides in underneath).
// Pocket for the PCB on foam tape: rims along the long edges outside the pad
// zones and end stops (DSN: a centre tab at each end, between the corner
// pads; Matek: a full rim at the end without pads), all lower than the PCB
// top, so the pads and the trimmer stay free.
module buck_shelf() {
    c  = buck_clr;
    z1 = bs_z1 - 0.01;
    for (side = [-1, 1]) mirror_cx(side) box([bs_x0, bs_y0, hw_gt - 0.01], [hw_gi, bs_y1, bs_z0 + 0.01]);
    box([bs_x0, bs_y0, bs_z0], [bs_x1, bs_y1, bs_z1]);
    pl = !bk_m || buck_out_side < 0 ? bk_pad : 0;   // pad zones at the left and right ends
    pr = !bk_m || buck_out_side > 0 ? bk_pad : 0;
    for (yr = [[bs_y0, bk_y0 - c], [bk_y1 + c, bs_y1]])
        box([bk_x0 + pl, yr[0], z1], [bk_x1 - pr, yr[1], bk_rz]);
    for (s = [-1, 1]) {
        xr = s < 0 ? [bk_x0 - c - buck_rim, bk_x0 - c] : [bk_x1 + c, bk_x1 + c + buck_rim];
        if (!bk_m)
            box([xr[0], bk_cy - buck_tab_w / 2, z1], [xr[1], bk_cy + buck_tab_w / 2, bk_rz]);
        else if (s != buck_out_side)
            box([xr[0], bs_y0, z1], [xr[1], bs_y1, bk_rz]);
    }
}

module base() {
    difference() {
        union() {
            base_body();
            top_hook_lip();
            latch_hook_lip();
        }
        latch_cuts();
        anchor_groove(link_x, link_d);
        anchor_groove(ve_x, ve_d);
        if (bk) anchor_groove(sup_x, sup_d, ay2, sup_room);
    }
    difference() {
        union() {
            hw_guides();
            bottom_block();
            esp_top_block();
            anchor_bar(link_x, link_d);
            anchor_bar(ve_x, ve_d);
            top_beam();
            stem_bridge();
            if (bk) {
                anchor_bar(sup_x, sup_d, ay2);
                buck_shelf();
            }
        }
        band_relief();
        snap_grooves();
    }
}

// ---------------------------------------------------------------------------
// Cover

module u_slot2d(x, d) {
    w = d + cable_clr;
    hull() {
        translate([x, cable_z + d / 2]) circle(d = w);
        translate([x - w / 2, plate_t - 1]) square([w, 1]);
    }
}

module u_slot(x, d) {
    translate([0, H + 1, 0]) rotate([90, 0, 0]) linear_extrude(wall + 2) u_slot2d(x, d);
    // lead-in on the outer face
    hull() {
        translate([0, H - lead_in, 0]) rotate([90, 0, 0]) linear_extrude(0.01) u_slot2d(x, d);
        translate([0, H + 0.01, 0]) rotate([90, 0, 0]) linear_extrude(0.01)
            offset(delta = lead_in) u_slot2d(x, d);
    }
}

// USB-C opening in the x/z plane: rounded, with the edge towards the base
// chamfered so it prints as a short bridge
module usb2d() {
    translate([cx, usb_z]) hull() {
        offset(r = usb_r) square([usb_w - 2 * usb_r, usb_h - 2 * usb_r], center = true);
        translate([-usb_bridge / 2, -usb_h / 2 - ((usb_w - usb_bridge) / 2 - usb_r)])
            square([usb_bridge, 0.01]);
    }
}

// Bolt hole through a wall along y: teardrop pointing towards the rim (up
// when the cover is printed), lead-in on the outer face. dir = +1 if the
// hole runs +y from the outer face.
module bolt_hole(x, y_face, z, dir) {
    ya = dir > 0 ? y_face - 1 : y_face - wall - 1;
    yb = dir > 0 ? y_face + wall + 1 : y_face + 1;
    translate([x, yb, z]) rotate([90, 0, 0]) linear_extrude(yb - ya) rotate(180) teardrop2d(bolt_d / 2);
    lead_in_y(x, y_face, z, bolt_d, dir);
}

// Snap beads on the inner faces of the long walls, into the side rail grooves.
// 45 deg flanks: the flank towards the front plate prints as a 45 deg
// overhang, the other one is the lead-in over the rail top chamfer.
module snap_beads() {
    for (side = [-1, 1]) mirror_cx(side)
        xz_profile(snap_y0, snap_y1, [
            [wall - 0.01, snap_zc - snap_h - 0.01], [wall + snap_h, snap_zc],
            [wall - 0.01, snap_zc + snap_h + 0.01]]);
}

module cover() {
    snap_beads();
    difference() {
        // rounded vertical edges, chamfered bed edge on the front
        hull() {
            outline_slab(plate_t, z_co - bed_ch);
            outline_slab(z_co - 0.01, z_co, bed_ch);
        }
        // cavity with a 45 deg fillet along the front plate
        hull() {
            outline_slab(plate_t - 1, z_ci - in_ch, wall);
            outline_slab(z_ci - 0.01, z_ci, wall + in_ch);
        }
        translate([0, wall + 1, 0]) rotate([90, 0, 0]) linear_extrude(wall + 2) usb2d();
        bolt_hole(bb_x, 0, bb_z, 1);
        bolt_hole(cx, H, tb_bz, -1);
        // cable U-slots, open towards the base
        u_slot(link_x, link_d);
        u_slot(ve_x, ve_d);
        if (bk) u_slot(sup_x, sup_d);
        // rim relief over the latch stem
        box([stem_x0 - slot - 0.5, -1, plate_t - 1], [stem_x1 + slot + 0.5, wall + 1, plate_t + 0.6]);
    }
}

// ---------------------------------------------------------------------------
// Assembly view

module rail() {
    wi0 = rail_bot + flange_w - flange_t;
    wi1 = rail_top - flange_w + flange_t;
    color("silver", 0.6)
        yz_profile(-15, W + 30, [
            [rail_bot, 0], [rail_bot + flange_w, 0],
            [rail_bot + flange_w, -(rail_h - flange_t)],
            [rail_top - flange_w, -(rail_h - flange_t)],
            [rail_top - flange_w, 0], [rail_top, 0],
            [rail_top, -flange_t], [wi1, -flange_t],
            [wi1, -rail_h], [wi0, -rail_h],
            [wi0, -flange_t], [rail_bot, -flange_t]]);
}

module boards() {
    // ESP pressed up against the top-end jaws by the spring
    ez = esp_z + esp_clr;
    color("darkgreen") translate([cx - esp_w / 2, esp_y0, ez]) cube([esp_w, esp_l, esp_t]);
    color("gray") translate([cx - 4.5, esp_y0 - esp_usb_over, ez + esp_t]) cube([9, 7.5, esp_usb_h]);
    // chip antenna keep-out
    color("white") translate([cx + ant_off - ant_w / 2, esp_y1 - ant_d, ez + esp_t]) cube([ant_w, ant_d, ant_h]);
    color("blue") translate([cx - hw_w / 2, hw_y0, hw_z]) cube([hw_w, hw_l, hw_t]);
    color("navy") translate([cx - hw_w / 2 + 1.5, hw_y0 + 4, hw_z + hw_t]) cube([hw_w - 3, hw_l - 8, hw_comp_h]);
    buck_board();
}

// Converter PCB and parts. Pad and trimmer layout are assumptions, check
// the actual board: DSN pads at the four corners (OUT at the buck_out_side
// end), trimmer next to the OUT end; Matek pads along the buck_out_side end.
bk_out_x = buck_out_side < 0 ? bk_x0 : bk_x1;   // OUT end edge
bk_in_x  = buck_out_side < 0 ? bk_x1 : bk_x0;
bk_trim  = [bk_out_x - buck_out_side * 2.5, bk_cy];  // DSN trimmer centre

module buck_board() if (bk) {
    zt = bk_z + bk_t;
    color("purple") translate([bk_x0, bk_y0, bk_z]) cube([bk_l, bk_w, bk_t]);
    if (!bk_m) {
        color("dimgray") translate([cx - 3, bk_cy - 3, zt]) cube([6, 6, bk_h]);           // inductor
        color("white") translate([bk_trim[0] - 1.5, bk_trim[1] - 1.5, zt]) cube([3, 3, 2]); // trimmer
    } else {
        x0 = buck_out_side < 0 ? bk_x0 + bk_pad + 0.5 : bk_x0 + 0.5;
        color("dimgray") translate([x0, bk_y0 + 0.5, zt]) cube([bk_l - bk_pad - 1, bk_w - 1, bk_h]);
    }
}

// Soldering access over the pads, from the PCB underside (castellations) to
// the cover; must stay clear of the base.
module buck_pad_keepout() if (bk) {
    zr = [bk_z, z_ci];
    if (!bk_m) {
        for (xe = [bk_x0, bk_x1], ye = [bk_y0, bk_y1 - 2.5]) {
            xa = xe == bk_x0 ? xe - 0.2 : xe - 2.5;
            box([xa, ye, zr[0]], [xa + 2.7, ye + 2.5, zr[1]]);
        }
    } else {
        xa = buck_out_side < 0 ? bk_x0 - 1.0 : bk_x1 - bk_pad;
        box([xa, bk_y0, zr[0]], [xa + bk_pad + 1.0, bk_y1, zr[1]]);
    }
}

// Screwdriver access to the DSN trimmer with the cover off.
module buck_trim_keepout() if (bk && !bk_m) {
    translate([bk_trim[0], bk_trim[1], bk_z + bk_t + 2]) cylinder(d = 4, h = 30);
}

if (part == "base") {
    base();
} else if (part == "cover") {
    // print orientation: front face on the bed
    translate([W, 0, z_co]) rotate([0, 180, 0]) cover();
} else {
    color("orange") base();
    boards();
    color("teal", 0.5) cover();
    rail();
}
