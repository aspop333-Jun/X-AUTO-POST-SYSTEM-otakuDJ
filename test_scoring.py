from kotaro_scoring import KotaroScorer

s = KotaroScorer()

# Test 1: Smile + Peace sign photo (should be P02 or P05)
a1 = {
    "A01": True,
    "B01": True,
    "B02": True,  
    "B03": True,
    "B07": True,
    "D05": True,
}

# Test 2: Cool pose photo (should be P07 or P10)
a2 = {
    "A06": True,
    "C01": True,
    "C08": True,
    "C07": True,
}

print("=== Test 1: Smile + Peace ===")
p1, ps1, sbp1 = s.score_from_answers(a1)
print(f"Pattern: {p1} ({s.patterns[p1]['name']})")
print(f"Comment: {s.get_comment(p1)}")
top5 = sorted(ps1.items(), key=lambda x:-x[1])[:5]
print(f"Top5: {top5}")
print(f"Winner sub_scores: {sbp1[p1]}")

print()
print("=== Test 2: Cool Pose ===")
p2, ps2, sbp2 = s.score_from_answers(a2)
print(f"Pattern: {p2} ({s.patterns[p2]['name']})")
print(f"Comment: {s.get_comment(p2)}")
top5_2 = sorted(ps2.items(), key=lambda x:-x[1])[:5]
print(f"Top5: {top5_2}")
print(f"Winner sub_scores: {sbp2[p2]}")
