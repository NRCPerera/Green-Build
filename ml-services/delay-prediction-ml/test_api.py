import urllib.request as r, json

def predict(data):
    req = r.Request('http://localhost:8002/predict', data=json.dumps({'data': data}).encode(), headers={'Content-Type': 'application/json'})
    res = json.loads(r.urlopen(req).read().decode())
    return f"{res['regression_result']['predicted_delay_days']:.1f} days"

base = {'Project_Type': 'House', 'Province': 'Western', 'District': 'Colombo', 'Location': 'Colombo', 
    'Contractor_ICTAD_Grade': 'C1', 'Start_Season': 'Dry Season', 'Payment_Delay_History': 'No', 
    'Floors': 1, 'Contractor_Experience_Years': 10, 'Contractor_Previous_Projects': 20, 
    'Contractor_Past_Delay_Rate': 0.15, 'Labour_Pool_Size': 200, 'Labour_Assigned_To_Project': 150, 
    'Planned_Duration_Days': 360, 'Weather_Impact_Days': 25, 'Design_Change_Orders': 3, 
    'Material_Delivery_Delay_Days': 5, 'Payment_Delay_Days': 10}

low = dict(base)
low['Contractor_Past_Delay_Rate'] = 0.05
low['Weather_Impact_Days'] = 5
low['Material_Delivery_Delay_Days'] = 2
low['Payment_Delay_Days'] = 2

vlow = dict(base)
vlow['Contractor_Past_Delay_Rate'] = 0.0
vlow['Weather_Impact_Days'] = 0
vlow['Material_Delivery_Delay_Days'] = 0
vlow['Payment_Delay_Days'] = 0

high = dict(base)
high['Contractor_Past_Delay_Rate'] = 0.45
high['Weather_Impact_Days'] = 60
high['Material_Delivery_Delay_Days'] = 30
high['Payment_Delay_Days'] = 30

print('Base Risk:', predict(base))
print('Low Risk:', predict(low))
print('Zero Risk:', predict(vlow))
print('High Risk:', predict(high))
