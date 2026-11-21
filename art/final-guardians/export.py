"""Editable low-resolution animation sheet. Run from the repository root."""
from PIL import Image, ImageDraw
from pathlib import Path

ink, navy, iron, silver, ivory = '#131b29','#254057','#527386','#a2b6b0','#f1dfaf'
copper, red, gold, mint = '#a35742','#f5765d','#e9b158','#88e0bf'
sheet = Image.new('RGBA',(48*5,40*3))
for actor in range(3):
    for pose in range(5):
        frame = Image.new('RGBA',(48,40))
        d = ImageDraw.Draw(frame)
        lamp = [mint,gold,red,ivory,iron][pose]
        if actor == 1:  # A suspended coil with twin flywheels and a ceramic insulator.
            for x in (11,36):
                d.ellipse((x-10,8,x+9,27),fill=navy,outline=ink,width=2)
                d.ellipse((x-7,11,x+6,24),outline=copper,width=2)
                d.line((x-5,22-pose%2*9,x+5,13+pose%2*9),fill=gold,width=2)
            d.polygon([(14,13),(20,6),(27,6),(33,14),(30,26),(24,35),(17,27)],fill=iron,outline=ink,width=2)
            for y in (9,13,17): d.rectangle((19,y,28,y+1),fill=ivory)
            d.ellipse((19,19,28,28),fill=navy,outline=copper,width=2)
            d.rectangle((22,22,25,25),fill=lamp)
        elif actor == 2:  # Radio command crawler: sloped armour, dish, tracked chassis.
            d.rounded_rectangle((3,25,45,37),radius=5,fill=ink)
            for x in range(9,42,8): d.ellipse((x-3,28,x+3,34),fill=iron,outline=silver)
            d.polygon([(5,26),(10,15),(29,13),(38,20),(42,26)],fill=copper,outline=ink,width=2)
            d.line((14,16,32,17),fill=gold,width=2)
            d.rectangle((5,19,19,22),fill=navy);d.rectangle((6,19,11,20),fill=lamp)
            d.line((31,19,30,9),fill=iron,width=3)
            d.pieslice((18,-2,42,16),20,155,fill=silver,outline=ink,width=2)
            d.line((31,9,36,2),fill=ivory,width=2)
        else:  # Low armoured emplacement, trunnion, lens and vented gun tube.
            d.polygon([(4,36),(8,28),(16,24),(35,24),(42,29),(45,36)],fill=navy,outline=ink,width=2)
            d.rectangle((9,32,40,33),fill=silver)
            d.ellipse((13,11,39,30),fill=iron,outline=ink,width=2)
            d.polygon([(13,18),(18,10),(30,8),(39,15),(37,19)],fill=copper,outline=ink,width=2)
            d.line((19,12,31,10),fill=gold,width=2)
            d.rectangle((1+(pose==2)*2,18,22,23),fill=navy,outline=ink)
            d.line((3,19,15,19),fill=silver);d.ellipse((21,16,29,24),fill=ink,outline=silver)
            d.rectangle((23,18,27,21),fill=lamp)
        if pose==4:
            wreck=frame.resize((48,16),Image.Resampling.NEAREST);frame=Image.new('RGBA',(48,40));frame.paste(wreck,(0,23))
            d=ImageDraw.Draw(frame);d.line((18,31,23,33,20,37),fill=ink,width=2)
        sheet.paste(frame,(pose*48,actor*40))
sheet.save(Path('games/cinder-shift/public/assets/final-guardians.png'))
