import glob, numpy as np, json, datetime as dt
def load_ticks(d='/tmp/van/ticks'):
    T=[];B=[];A=[]
    for f in sorted(glob.glob(d+'/*.csv')):
        h=open(f).readline()
        hour=h.split('hour=')[1].split(',')[0]
        t0=dt.datetime.strptime(hour,'%Y.%m.%d %H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp()*1000
        a=np.loadtxt(f,delimiter=',',skiprows=2)
        T.append(a[:,0]+t0);B.append(a[:,1]);A.append(a[:,2])
    return np.concatenate(T),np.concatenate(B),np.concatenate(A)
def P(s): return dt.datetime.strptime(s,'%Y.%m.%d %H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp()*1000
def real_trades(f='/tmp/van/history.json'):
    ds=json.load(open(f))['deals']; ds.sort(key=lambda d:(P(d['time']),d['ticket']))
    q=[];tr=[]
    for d in ds:
        if d['entry']=='IN': q.append(d)
        else:
            want='SELL' if d['type']=='BUY' else 'BUY'
            k=next((i for i,o in enumerate(q) if o['type']==want),None)
            if k is None: continue
            o=q.pop(k); tr.append(dict(side=1 if o['type']=='BUY' else -1,ot=P(o['time']),ct=P(d['time']),op=o['price'],cp=d['price'],pl=d['profit']))
    return tr
