// src/data/scenes/boom_room.ink
VAR player_audacity = 0
VAR player_capital = 0

=== start ===
The bass is rattling your molars. Margaux slides a folder across the table.
# background: club_vip_01.jpg
# npc: npc_margaux

+ [Open the folder.]
    -> reveal_forgery
+ {player_audacity >= 50} [Refuse to look.]
    -> margaux_angry

=== reveal_forgery ===
Inside: certificates of authenticity for three Basquiat sketches. They look... almost real.
# reward: forged_basquiat_certificate
# trigger: MINIGAME_HAGGLE
# target: npc_margaux
-> END

=== margaux_angry ===
Margaux's jaw tightens. "You don't say no to me, darling."
# consequence: npc_margaux_grudge
# phone_message: msg_margaux_warning
-> END
