"""Render the three original campaign pieces. Requires NumPy, SciPy and ffmpeg.

Run from any directory with python scripts/render-music.py. The score and
instruments below are the full source; no sampled instruments or recordings.
"""
from pathlib import Path
import subprocess
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

RATE = 32000
OUT = Path(__file__).resolve().parents[1] / "docs" / "music"
TAU = 2 * np.pi
# Pitch numbers are semitones (middle C = 60). Each melody entry is
# (offset in beats, pitch, duration). Rubato and dynamics are applied at render.
COAST = [
    [(0, 69, 1.2), (1.5, 74, .8)], [(0, 76, 1.35), (2, 73, .75)],
    [(.5, 71, .85), (1.5, 69, 1.2)], [(0, 66, 2.1)],
    [(0, 67, .9), (1, 71, .65), (2, 74, 1.0)], [(0, 73, 1.6)],
    [(0, 71, .8), (1, 69, 1.2)], [(0, 64, 2.25)],
    [(1, 69, .95), (2, 74, .7)], [(0, 78, 1.5), (2, 76, .75)],
    [(0, 74, .9), (1.25, 71, 1.5)], [(.5, 69, 1.8)],
    [(0, 67, .75), (1, 69, .6), (1.8, 71, 1.1)], [(0, 74, 1.45), (2, 73, .8)],
    [(0, 69, 1.35), (1.75, 64, .85)], [(0, 62, 2.3)],
]
TRESTLE = [
    [(.5, 67, .7), (1.5, 70, .7), (3, 72, .55)], [(0, 74, 1.6), (2.5, 72, .95)],
    [(0, 70, .6), (1, 67, 1.5)], [(1, 65, 1.8)],
    [(.5, 67, .55), (1.25, 70, .55), (2, 75, 1.35)], [(0, 74, 1), (2, 70, 1.4)],
    [(.5, 67, 1.5), (2.5, 65, .7)], [(0, 62, 2.25)],
    [(.5, 70, .8), (1.5, 74, 1.25)], [(0, 77, .8), (1, 75, .75), (2, 74, 1.25)],
    [(0, 72, 1.5), (2.5, 70, 1)], [(.5, 67, 1.9)],
    [(0, 68, .8), (1.5, 72, .8), (2.5, 75, 1)], [(0, 74, 1.8), (3, 70, .7)],
    [(.5, 69, 1.5), (2.5, 65, .95)], [(0, 67, 2.8)],
]
NIGHT = [
    [(1, 71, 1), (2.5, 76, 1.15)], [(0, 78, 2.2)], [(.5, 76, .9), (2, 73, 1.7)], [(1, 71, 2.2)],
    [(0, 69, 1), (1.5, 73, 1.5)], [(.75, 76, 2.1)], [(0, 74, 1.5), (2.5, 71, .9)], [(0, 66, 2.75)],
    [(0, 71, 1.35), (2, 78, 1.5)], [(0, 81, 1.85), (2.5, 78, 1)],
    [(.5, 76, 1.4), (2.5, 73, 1.2)], [(0, 71, 2.7)],
    [(0, 69, .9), (1.5, 74, 1.45)], [(.5, 73, 1.3), (2.5, 69, 1)],
    [(0, 68, 1.4), (2, 66, 1.1)], [(0, 64, 3.0)],
]
PIECES = {
    "pacific-light": (65, 3, COAST, "flute", "guitar", [
        (50, 57, 62, 66), (49, 57, 61, 64), (47, 54, 59, 62), (50, 57, 62, 66),
        (43, 55, 59, 62), (45, 57, 61, 64), (47, 54, 59, 62), (45, 52, 57, 64)]),
    "the-trestle": (85, 4, TRESTLE, "reed", "wood", [
        (43, 55, 58, 62), (46, 53, 58, 62), (48, 55, 60, 63), (46, 53, 58, 65),
        (44, 55, 60, 63), (46, 53, 58, 62), (50, 57, 60, 65), (43, 55, 58, 62)]),
    "night-observatory": (69, 4, NIGHT, "felt", "glass", [
        (40, 52, 59, 63), (47, 54, 59, 66), (45, 52, 57, 61), (40, 52, 56, 59),
        (45, 57, 61, 64), (49, 56, 61, 64), (50, 57, 62, 66), (47, 54, 59, 66)]),
}


def envelope(t, length, attack, release):
    return np.minimum(t / attack, 1) ** 1.4 * np.exp(-np.maximum(t - length, 0) / release)


def instrument(voice, pitch, seconds, rng):
    release = {"flute": .085, "reed": .11, "pad": .38, "bass": .14,
               "felt": .27, "glass": .42, "guitar": .19, "wood": .14}[voice]
    t = np.arange(int(RATE * (seconds + 5 * release))) / RATE
    f = 440 * 2 ** ((pitch - 69 + rng.uniform(-.014, .014)) / 12)
    phase = TAU * f * t
    if voice in ("flute", "reed", "pad"):
        vib = (.16 if voice == "pad" else .11) * (1 - np.exp(-3*t)) * np.sin(TAU * 4.9*t)
        harmonics = {"flute": [1, .18, .12, .035], "reed": [.82, .15, .32, .09, .08],
                     "pad": [.62, .28, .12, .05]}[voice]
        signal = sum(h*np.sin((i+1)*(phase+vib)) for i, h in enumerate(harmonics))
        if voice == "pad":
            signal = .52*signal + .27*np.sin(phase*1.0021) + .24*np.sin(phase*.9979)
        else:
            air = sosfilt(butter(2, [850, 3500], btype="band", fs=RATE, output="sos"),rng.normal(size=len(t)))
            signal += (.034 + .07*np.exp(-11*t))*air
        return signal * envelope(t, seconds, .17 if voice=="pad" else .105, release)
    partials = {
        "guitar": [(1, 1), (2, .57), (3.001, .36), (4.004, .12), (5.008, .17), (7.02, .07)],
        "bass": [(1, 1), (2, .56), (3, .29), (4, .09)],
        "felt": [(1, 1), (2.002, .5), (3.006, .22), (4.015, .07), (5.027, .08)],
        "wood": [(1, 1), (3.98, .36), (9.93, .095)],
        "glass": [(1, 1), (2.002, .2), (3.04, .16), (7.04, .07)],
    }[voice]
    decay = {"bass":1.3,"guitar":1.25,"felt":1.05,"wood":2.5,"glass":.92}[voice]
    signal = sum(amp*np.sin(ratio*phase)*np.exp(-decay*(.5+ratio*.43)*t)
                 for ratio,amp in partials if f*ratio<RATE*.48)
    if voice in ("guitar", "felt"):
        signal += .09*np.sin(2.006*phase)*np.exp(-3*t)
    return signal * envelope(t, seconds, .012 if voice=="bass" else .007, release)


def render(name, settings):
    bpm, meter, melody, lead, pattern, chords = settings
    rng = np.random.default_rng(sum(name.encode()))
    beat = 60 / bpm
    frames = round(len(melody)*meter*beat*RATE)
    track = np.zeros((frames,2))
    def play(time, pitch, duration, voice, level, pan):
        start=round((time*beat+rng.uniform(-.014,.014))*RATE) % frames
        note=level*rng.uniform(.91,1.08)*instrument(voice,pitch,duration*beat,rng)
        stereo=note[:,None]*np.array([np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4)])
        span=min(len(note),frames-start)
        track[start:start+span] += stereo[:span]
        if span<len(note):
            track[:len(note)-span] += stereo[span:]
    for i, phrase in enumerate(melody):
        chord=chords[i%len(chords)]; bar=i*meter
        dynamics=.85 + .16*np.sin(i*np.pi/8)
        for offset,pitch,duration in phrase:
            play(bar+offset,pitch,duration,lead,.26*dynamics,.13)
        play(bar,chord[0]-12,1.45,"bass",.30,.02)
        if i%4!=3 and meter==4:
            play(bar+2.5,chord[0]-5,.8,"bass",.17,-.05)
        ostinato = {"guitar":[(0,1),(.5,2),(1,3),(1.5,2),(2.5,1)],
                    "wood":[(0,1),(.75,2),(1.5,3),(2.25,1),(3.5,2)],
                    "glass":[(.5,1),(1.25,2),(2.5,3)]}[pattern]
        for offset, tone in ostinato:
            play(bar+offset,chord[tone]+(12 if pattern=='glass' else 0),.88,pattern,.16 if pattern!='glass' else .085,-.45)
        for pitch in chord[1:3]:
            play(bar+.12,pitch,meter-.64,"pad",.055,.47)
        if i%4 in (2,3) and name!="night-observatory":
            play(bar+meter-1.25,chord[2]+12,1.0,"felt",.10,.60)

    # Stereo room tail wraps around the loop just like sustained notes do.
    for ch in range(2):
        rt=np.arange(round(.84*RATE))/RATE
        impulse=rng.normal(0,.0018,len(rt))*np.exp(-5.8*rt)
        for delay,gain in [(.035,.12),(.067,.09),(.109,.065),(.176,.045)]:
            impulse[int(RATE*delay*(1+.08*ch))]+=gain
        wet=fftconvolve(track[:,ch],impulse)
        track[:,ch] += wet[:frames]
        track[:len(wet)-frames,ch] += wet[frames:]
    track=sosfilt(butter(2,45,btype="highpass",fs=RATE,output='sos'),track,axis=0)
    track=np.tanh(track*1.25)
    track*=.78/np.max(np.abs(track))
    OUT.mkdir(parents=True,exist_ok=True)
    subprocess.run(["ffmpeg","-nostdin","-y","-loglevel","error","-f","s16le","-ar",str(RATE),
                    "-ac","2","-i","pipe:0","-codec:a","libmp3lame","-b:a","64k",
                    str(OUT/(name+".mp3"))],input=np.asarray(track*32767,dtype="<i2").tobytes(),check=True)
    print(f"{name}: {frames/RATE:.1f} s")

if __name__ == '__main__':
    for key in sys.argv[1:] or PIECES:
        render(key, PIECES[key])
